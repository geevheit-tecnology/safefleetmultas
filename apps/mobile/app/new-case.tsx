import { router } from "expo-router";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { createWorker } from "tesseract.js";
import { attachDocument, createCase, runSmartTriage } from "../src/api/client";
import { useLanguage } from "../src/i18n";
import { AppShell } from "../src/ui/AppShell";
import { Panel, Pill } from "../src/ui/Primitives";

type SelectedDocument = {
  name: string;
  type: string;
  mimeType: string;
  sizeBytes: number;
  uri: string;
};

type ScanResult = {
  fields: {
    infractionNumber?: string;
    processNumber?: string;
    category?: string;
    subcategory?: string;
    vehiclePlate?: string;
    driverName?: string;
    rntrc?: string;
    authority?: string;
    location?: string;
    amount?: string;
    description?: string;
    autuadoName?: string;
    autuadoDocument?: string;
    address?: string;
    origin?: string;
    destination?: string;
    distanceKm?: string;
    article?: string;
    code?: string;
    issueDate?: string;
    infractionDate?: string;
    defenseDeadline?: string;
  };
  confidence: number;
  notes: string[];
};

export default function NewCaseScreen() {
  const [infractionNumber, setInfractionNumber] = useState("");
  const [processNumber, setProcessNumber] = useState("");
  const [category, setCategory] = useState("Transporte");
  const [subcategory, setSubcategory] = useState("");
  const [description, setDescription] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [driverName, setDriverName] = useState("");
  const [rntrc, setRntrc] = useState("");
  const [authority, setAuthority] = useState("ANTT");
  const [location, setLocation] = useState("");
  const [amount, setAmount] = useState("");
  const [ocrText, setOcrText] = useState("");
  const [showOcrText, setShowOcrText] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<SelectedDocument | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { codeLabel } = useLanguage();

  const setImageDocument = (asset: ImagePicker.ImagePickerAsset, source: "camera" | "gallery") => {
    const name = asset.fileName ?? `${source}-${Date.now()}.jpg`;
    setSelectedDocument({
      name,
      type: "AUTO_INFRACAO",
      mimeType: asset.mimeType ?? "image/jpeg",
      sizeBytes: asset.fileSize ?? 0,
      uri: asset.uri
    });
    setScanResult(null);
  };

  const takePhoto = async () => {
    setError(null);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError("Permita acesso a camera para fotografar o documento.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.85,
      mediaTypes: ImagePicker.MediaTypeOptions.Images
    });
    if (!result.canceled && result.assets[0]) setImageDocument(result.assets[0], "camera");
  };

  const chooseImage = async () => {
    setError(null);
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      quality: 0.9,
      mediaTypes: ImagePicker.MediaTypeOptions.Images
    });
    if (!result.canceled && result.assets[0]) setImageDocument(result.assets[0], "gallery");
  };

  const choosePdf = async () => {
    setError(null);
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: ["application/pdf"]
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setSelectedDocument({
        name: asset.name,
        type: "AUTO_INFRACAO",
        mimeType: asset.mimeType ?? "application/pdf",
        sizeBytes: asset.size ?? 0,
        uri: asset.uri
      });
      setScanResult(null);
    }
  };

  const scanDocument = async () => {
    if (!selectedDocument) {
      setError("Selecione uma foto, imagem ou PDF antes de iniciar a leitura.");
      return;
    }
    setScanning(true);
    setScanStatus(isImageDocument(selectedDocument) ? "Lendo imagem por OCR..." : "Lendo texto informado...");
    setError(null);
    try {
      const extractedText = isImageDocument(selectedDocument) ? await extractImageText(selectedDocument, setScanStatus) : "";
      const combinedText = [ocrText, extractedText].filter(Boolean).join("\n");
      if (extractedText && extractedText !== ocrText) setOcrText(combinedText);
      if (extractedText) setShowOcrText(false);
      setScanStatus("Extraindo campos da multa...");
      const result = await scanSelectedDocument(selectedDocument, combinedText);
      setScanResult(result);
      if (result.fields.infractionNumber) setInfractionNumber(result.fields.infractionNumber);
      if (result.fields.processNumber) setProcessNumber(result.fields.processNumber);
      if (result.fields.category) setCategory(result.fields.category);
      if (result.fields.subcategory) setSubcategory(result.fields.subcategory);
      if (result.fields.vehiclePlate) setVehiclePlate(result.fields.vehiclePlate);
      if (result.fields.driverName) setDriverName(result.fields.driverName);
      if (result.fields.rntrc) setRntrc(result.fields.rntrc);
      if (result.fields.authority) setAuthority(result.fields.authority);
      if (result.fields.location) setLocation(result.fields.location);
      if (result.fields.amount) setAmount(result.fields.amount);
      if (result.fields.description) setDescription(result.fields.description);
    } finally {
      setScanning(false);
      setScanStatus("");
    }
  };

  const submit = async () => {
    setSaving(true);
    setError(null);
    let createdCaseId: string | null = null;
    try {
      const triage = selectedDocument ? scanResult ?? await scanSelectedDocument(selectedDocument, ocrText) : null;
      if (triage && !scanResult) setScanResult(triage);
      const resolvedInfractionNumber = triage?.fields.infractionNumber ?? infractionNumber;
      const resolvedCategory = triage?.fields.category ?? category;
      if (!resolvedInfractionNumber.trim() || !resolvedCategory.trim()) {
        setError("Informe o numero do documento e a categoria.");
        return;
      }
      const created = await createCase({
        infractionNumber: resolvedInfractionNumber,
        processNumber: triage?.fields.processNumber ?? processNumber,
        category: resolvedCategory,
        subcategory: triage?.fields.subcategory ?? subcategory,
        description: description || triage?.fields.description || "",
        vehiclePlate: triage?.fields.vehiclePlate ?? vehiclePlate,
        driverName: triage?.fields.driverName ?? driverName,
        rntrc: triage?.fields.rntrc ?? rntrc,
        authority: triage?.fields.authority ?? authority,
        location: triage?.fields.location ?? location,
        amount: parseMoney(triage?.fields.amount ?? amount)
      });
      createdCaseId = created.id;
      if (selectedDocument) {
        try {
          const withDocument = await attachDocument({
            caseId: created.id,
            name: selectedDocument.name,
            type: selectedDocument.type,
            mimeType: selectedDocument.mimeType,
            sizeBytes: selectedDocument.sizeBytes,
            sha256: await buildDocumentHash(selectedDocument),
            storageKey: buildStorageKey(created.id, selectedDocument.name)
          });
          const attachedDocument = withDocument.documents.find((document) => document.name === selectedDocument.name);
          await runSmartTriage({
            caseId: created.id,
            documentId: attachedDocument?.id,
            documentName: selectedDocument.name,
            extractedData: triage?.fields ?? {},
            confidence: triage?.confidence ?? 0,
            notes: triage?.notes ?? ["Documento anexado para triagem manual."]
          });
        } catch {
          router.replace(`/cases/${created.id}`);
          return;
        }
      }
      router.replace(`/cases/${created.id}`);
    } catch {
      if (createdCaseId) {
        router.replace(`/cases/${createdCaseId}`);
        return;
      }
      setError("Nao foi possivel criar o prontuario. Confira os campos obrigatorios e tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell title="Nova multa" subtitle="Entrada estruturada para qualquer orgao fiscalizador, com confirmacao humana antes de gravar dados criticos">
      <Panel title="Captura do documento">
        <View style={styles.uploadBox}>
          <Text style={styles.uploadTitle}>Fotografar ou anexar documento</Text>
          <Text style={styles.body}>Use a camera do celular, selecione uma imagem ou anexe um PDF. Fotos e imagens passam por OCR automatico; PDF escaneado pode ser complementado colando o texto reconhecido abaixo.</Text>
          <View style={styles.captureActions}>
            <CaptureButton label="Tirar foto" onPress={takePhoto} />
            <CaptureButton label="Escolher imagem" onPress={chooseImage} />
            <CaptureButton label="Anexar PDF" onPress={choosePdf} />
          </View>
          {selectedDocument ? (
            <View style={styles.selectedDocument}>
              <Text style={styles.selectedTitle}>{selectedDocument.name}</Text>
              <Text style={styles.body}>{selectedDocument.mimeType} · {formatBytes(selectedDocument.sizeBytes)}</Text>
              <View style={styles.scanActions}>
                <Pressable disabled={scanning} onPress={scanDocument} style={({ pressed }) => [styles.scanButton, pressed && styles.pressed, scanning && styles.disabled]}>
                  <Text style={styles.scanButtonText}>{scanning ? "Lendo documento..." : "Ler e preencher"}</Text>
                </Pressable>
                <Pill text="Edicao manual liberada" tone="#17745b" />
              </View>
              {scanStatus ? <Text style={styles.scanStatus}>{scanStatus}</Text> : null}
              {scanResult ? (
                <View style={styles.scanSummary}>
                  <Text style={styles.scanTitle}>Leitura preliminar</Text>
                  <Text style={styles.body}>{scanResult.confidence}% de confianca. Revise os campos antes de criar o prontuario.</Text>
                  {scanResult.notes.map((note) => <Text key={note} style={styles.scanNote}>{note}</Text>)}
                </View>
              ) : null}
            </View>
          ) : (
            <Pill text="Foto, imagem ou PDF" tone="#5c7fa8" />
          )}
          <View style={styles.ocrTextBox}>
            <View style={styles.ocrHeader}>
              <Text style={styles.label}>Texto OCR ou texto copiado do PDF</Text>
              <Pressable onPress={() => setShowOcrText((value) => !value)} style={({ pressed }) => [styles.smallGhostButton, pressed && styles.pressed]}>
                <Text style={styles.smallGhostButtonText}>{showOcrText ? "Ocultar texto" : "Ver texto OCR"}</Text>
              </Pressable>
            </View>
            {showOcrText ? (
              <TextInput
                multiline
                value={ocrText}
                onChangeText={setOcrText}
                placeholder="Cole aqui o texto reconhecido da notificacao para extrair numero do auto, autuado, CNPJ, placa, RNTRC, valor, artigo, local e datas."
                style={[styles.input, styles.ocrTextArea]}
                placeholderTextColor="#98a2b3"
              />
            ) : (
              <Text style={styles.ocrPreview}>
                {ocrText ? "Texto OCR capturado. Abra apenas se precisar conferir ou colar texto melhor." : "Opcional: cole aqui o texto do PDF ou abra para conferir o OCR."}
              </Text>
            )}
          </View>
        </View>
      </Panel>

      <Panel title="Dados iniciais">
        <View style={styles.formGrid}>
          <Field label="Numero do documento" value={infractionNumber} onChangeText={setInfractionNumber} placeholder="AI-000000/2026" />
          <Field label="Processo" value={processNumber} onChangeText={setProcessNumber} placeholder="Processo administrativo" />
          <Field label="Categoria" value={category} onChangeText={setCategory} placeholder="Transporte, fiscal, trabalhista, transito" />
          <Field label="Subcategoria" value={subcategory} onChangeText={setSubcategory} placeholder="Descricao operacional" />
          <Field label="Placa" value={vehiclePlate} onChangeText={setVehiclePlate} placeholder="ABC-1D23" autoCapitalize="characters" />
          <Field label="Condutor" value={driverName} onChangeText={setDriverName} placeholder="Nome do condutor" />
          <Field label="RNTRC" value={rntrc} onChangeText={setRntrc} placeholder="00000000" keyboardType="numeric" />
          <Field label="Orgao" value={authority} onChangeText={setAuthority} placeholder="ANTT, PRF, SEFAZ, DETRAN" />
          <Field label="Local" value={location} onChangeText={setLocation} placeholder="Municipio/UF ou trecho" />
          <Field label="Valor estimado" value={amount} onChangeText={setAmount} placeholder="1500,00" keyboardType="decimal-pad" />
        </View>
        <View style={styles.descriptionField}>
          <Text style={styles.label}>Resumo do fato</Text>
          <TextInput
            multiline
            value={description}
            onChangeText={setDescription}
            placeholder="Descreva o fato, rota, documento citado e observacoes relevantes."
            style={[styles.input, styles.textArea]}
            placeholderTextColor="#98a2b3"
          />
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.actions}>
          <Pressable disabled={saving} onPress={submit} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, saving && styles.disabled]}>
            <Text style={styles.primaryButtonText}>{saving ? "Gravando..." : "Criar prontuario"}</Text>
          </Pressable>
        </View>
      </Panel>

      <Panel title="Regras de seguranca">
        <Text style={styles.body}>Nenhuma norma, prazo ou dado extraido por IA deve ser aceito sem validacao humana. Fontes nao confirmadas ficam como {codeLabel("NOT_VERIFIED")}.</Text>
      </Panel>
    </AppShell>
  );
}

function CaptureButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.captureButton, pressed && styles.pressed]}>
      <Text style={styles.captureButtonText}>{label}</Text>
    </Pressable>
  );
}

async function scanSelectedDocument(document: SelectedDocument, ocrText = ""): Promise<ScanResult> {
  await new Promise((resolve) => setTimeout(resolve, 350));
  const source = [
    normalizeOcrText(ocrText),
    decodeURIComponent(document.name).replace(/\.[a-z0-9]+$/i, "").replace(/[_-]+/g, " ")
  ].filter(Boolean).join("\n");
  const normalized = source.toUpperCase();
  const compact = normalized.replace(/[^A-Z0-9]/g, "");
  const infractionNumber =
    capture(normalized, /N[ºO]?\s*DO\s*AUTO\s*DE\s*INFRA[CÇ][AÃ]O\s+([A-Z0-9.-]{8,})/) ??
    capture(compact, /(FELTF\d{8,})/) ??
    capture(normalized, /\b(FELTF\d{8,})\b/) ??
    capture(normalized, /\b(?:AI|AIT|AUTO|INFRA[CÇ][AÃ]O|MULTA)\s*[-./:]?\s*([A-Z0-9]{3,}[-./]?\d{2,})\b/);
  const processNumber = capture(normalized, /PROCESSO\s+ADMINISTRATIVO\s+([0-9./-]{8,})/);
  const vehiclePlate = normalizePlate(
    capture(normalized, /PLACA\s*\/?\s*UF\s+([A-Z0-9-]{7,8})/) ??
    capture(normalized, /PLACA[\s\S]{0,35}?\b([A-Z]{2,3}[- ]?[0-9][A-Z0-9][0-9]{2})\b/) ??
    capture(normalized, /\b[A-Z]{3}[- ]?\d[A-Z0-9]\d{2}\b/)
  );
  const rntrc = capture(normalized, /\bRNTRC\s+([0-9]{5,12})\b/) ?? capture(normalized, /N[ÚU]MERO\s+DO\s+DOCUMENTO\s+([0-9]{5,12})/);
  const amount =
    capture(normalized, /MULTA[\s\S]{0,80}?R\$\s*([0-9.]+,\d{2})/) ??
    capture(normalized, /MULTA(?:\s+DE)?\s+R\$\s*([0-9.]+,\d{2})/) ??
    capture(normalized, /VALOR(?:\s+DA\s+MULTA)?\s*R\$\s*([0-9.]+,\d{2})/) ??
    pickLikelyFineAmount(normalized);
  const autuadoDocument = normalizeBrazilianDocument(
    capture(normalized, /(?:CPF|CNPJ|CPF\/CNPJ)[^\d]{0,10}([0-9./-]{11,18})/) ??
      capture(normalized, /\b(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})\b/)
  );
  const autuadoName =
    cleanPersonOrCompanyName(capture(normalized, /IDENTIFICA[CÇ][AÃ]O\s+DO\s+AUTUADO[\s\S]{0,180}?NOME\s+([A-Z0-9 .&/-]+?)\s+(?:CPF|CNPJ|CPF\/CNPJ)/)) ??
    extractNameNearDocument(normalized, autuadoDocument);
  const address = cleanLooseField(capture(normalized, /ENDERE[CÇ]O\s+([A-Z0-9 .ºª,/-]{3,90}?)\s+MUNIC[IÍ]PIO/), 90);
  const origin = cleanLooseField(capture(normalized, /ORIGEM\s+([A-Z .,-]{3,50}?)\s+DESTINO/), 50);
  const destination = cleanLooseField(capture(normalized, /DESTINO\s+([A-Z .,-]{3,50}?)\s+DIST[ÂA]NCIA/), 50);
  const distanceKm = capture(normalized, /DIST[ÂA]NCIA(?:\s+DE\s+ORIGEM\/DESTINO)?\s*\(?KM\)?\s+([0-9.,]+)/);
  const article = capture(normalized, /ARTIGO\s+([0-9]+[A-Z]?)/);
  const code = capture(normalized, /C[ÓO]DIGO\s+([0-9.]+)/);
  const issueDate = captureDate(normalized, /DATA\s+DE\s+EMISS[ÃA]O\s+([0-9]{2}\/[0-9]{2}\/[0-9]{4})/);
  const infractionDate = captureDate(normalized, /DATA\s+DA\s+INFRA[CÇ][AÃ]O\s+([0-9]{2}\/[0-9]{2}\/[0-9]{4})/);
  const defenseDeadline = captureDate(normalized, /AT[ÉE]\s+O\s+DIA\s+([0-9]{2}\/[0-9]{2}\/[0-9]{4})/) ?? pickFutureDate(normalized);
  const location = cleanLooseField(
    capture(normalized, /LOCAL\s+([A-Z0-9 .ºª,-]{3,80}?)\s+MUNIC[IÍ]PIO/) ??
      [capture(normalized, /MUNIC[IÍ]PIO\s+([A-Z .-]{3,40})/), capture(normalized, /\bUF\s+([A-Z]{2})\b/)].filter(Boolean).join("/"),
    80
  );
  const structuredFieldCount = [
    infractionNumber,
    processNumber,
    autuadoName,
    autuadoDocument,
    vehiclePlate,
    rntrc,
    amount,
    origin,
    destination,
    article,
    code,
    issueDate,
    infractionDate,
    defenseDeadline
  ].filter(Boolean).length;
  const reliableExtraction = structuredFieldCount >= 3 || Boolean(infractionNumber && (vehiclePlate || autuadoDocument || rntrc));
  const authority = reliableExtraction ? (normalized.includes("ANTT") ? "ANTT" : inferAuthority(normalized)) : undefined;
  const category = reliableExtraction ? inferCategory(normalized) : undefined;
  const subcategory = reliableExtraction ? inferSubcategory(normalized) : undefined;
  const safeAmount = reliableExtraction ? amount : undefined;
  const notes: string[] = [];

  if (infractionNumber) notes.push(`Numero identificado: ${infractionNumber}`);
  if (processNumber) notes.push(`Processo identificado: ${processNumber}`);
  if (autuadoName) notes.push(`Autuado identificado: ${toTitleCase(autuadoName)}`);
  if (autuadoDocument) notes.push(`Documento do autuado identificado: ${autuadoDocument}`);
  if (vehiclePlate) notes.push(`Placa identificada: ${vehiclePlate}`);
  if (rntrc) notes.push(`RNTRC identificado: ${rntrc}`);
  if (safeAmount) notes.push(`Valor identificado: R$ ${safeAmount}`);
  if (article || code) notes.push(`Enquadramento identificado: ${[article ? `art. ${article}` : "", code ? `codigo ${code}` : ""].filter(Boolean).join(" / ")}`);
  if (defenseDeadline) notes.push(`Prazo citado para defesa: ${defenseDeadline}`);
  if (category) notes.push(`Categoria sugerida: ${category}`);
  if (!reliableExtraction) notes.push("Leitura fraca: nao preenchi campos automaticamente. Tire outra foto mais reta, mais perto e com a parte superior da multa visivel.");
  const confidence = Math.min(
    96,
    30 +
      (infractionNumber ? 14 : 0) +
      (autuadoName ? 9 : 0) +
      (autuadoDocument ? 8 : 0) +
      (vehiclePlate ? 10 : 0) +
      (rntrc ? 8 : 0) +
      (safeAmount ? 8 : 0) +
      (origin || destination ? 6 : 0) +
      (article || code ? 6 : 0) +
      (issueDate || infractionDate || defenseDeadline ? 7 : 0)
  );
  const description =
    structuredFieldCount >= 3
      ? buildExtractedDescription({
          documentName: document.name,
          autuadoName,
          autuadoDocument,
          address,
          origin,
          destination,
          distanceKm,
          article,
          code,
          issueDate,
          infractionDate,
          defenseDeadline,
          processNumber
        })
      : `Documento ${document.name} lido por OCR. Campos extraidos com baixa confianca; revisar manualmente antes de criar defesa, recurso ou prazo.`;

  return {
    confidence,
    notes,
    fields: {
      infractionNumber,
      processNumber,
      category,
      subcategory,
      vehiclePlate,
      driverName: cleanPersonOrCompanyName(capture(normalized, /NOME\s+DO\s+CONDUTOR\s+([A-Z .'-]{3,70}?)(?:\s+CPF|\s+CNH|$)/)),
      rntrc,
      authority,
      location,
      amount: safeAmount,
      autuadoName: autuadoName ? toTitleCase(autuadoName) : undefined,
      autuadoDocument,
      address: address ? toTitleCase(address) : undefined,
      origin: origin ? toTitleCase(origin) : undefined,
      destination: destination ? toTitleCase(destination) : undefined,
      distanceKm,
      article,
      code,
      issueDate,
      infractionDate,
      defenseDeadline,
      description
    }
  };
}

function isImageDocument(document: SelectedDocument) {
  return document.mimeType.startsWith("image/");
}

async function extractImageText(document: SelectedDocument, onStatus: (status: string) => void) {
  if (!isImageDocument(document)) return "";
  if (Platform.OS !== "web") {
    onStatus("OCR automatico nativo ainda exige provedor externo; usando texto informado.");
    return "";
  }
  try {
    const worker = await createWorker("por", 1, {
      logger: (event) => {
        if (event.status === "recognizing text") onStatus(`Reconhecendo texto... ${Math.round(event.progress * 100)}%`);
        if (event.status === "loading language traineddata") onStatus("Carregando idioma portugues...");
      }
    });
    const variants = await buildOcrImageVariants(document.uri);
    let bestText = "";
    let bestScore = -1;
    for (let index = 0; index < variants.length; index += 1) {
      onStatus(variants.length > 1 ? `Testando orientacao da foto ${index + 1}/${variants.length}...` : "Reconhecendo texto...");
      const result = await worker.recognize(variants[index]);
      const text = result.data.text.trim();
      const score = scoreOcrText(text);
      if (score > bestScore) {
        bestScore = score;
        bestText = text;
      }
      if (score >= 10) break;
    }
    await worker.terminate();
    return bestText;
  } catch {
    onStatus("Nao foi possivel concluir o OCR automatico; use o texto colado ou revise manualmente.");
    return "";
  }
}

async function buildOcrImageVariants(uri: string) {
  if (typeof document === "undefined" || typeof createImageBitmap === "undefined") return [uri];
  try {
    const response = await fetch(uri);
    const bitmap = await createImageBitmap(await response.blob());
    const rotations = [0, 90, -90, 180];
    return rotations.map((rotation) => rotateBitmapToDataUrl(bitmap, rotation));
  } catch {
    return [uri];
  }
}

function rotateBitmapToDataUrl(bitmap: ImageBitmap, rotation: number) {
  const canvas = document.createElement("canvas");
  const sideways = Math.abs(rotation) === 90;
  canvas.width = sideways ? bitmap.height : bitmap.width;
  canvas.height = sideways ? bitmap.width : bitmap.height;
  const context = canvas.getContext("2d");
  if (!context) return "";
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate((rotation * Math.PI) / 180);
  context.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);
  return canvas.toDataURL("image/jpeg", 0.92);
}

function scoreOcrText(text: string) {
  const normalized = text.toUpperCase();
  return [
    /ANTT/.test(normalized),
    /FELTF\s*\d{6,}/.test(normalized.replace(/\s+/g, "")),
    /AUTO\s+DE\s+INFRA/.test(normalized),
    /CPF\s*\/?\s*CNPJ|CNPJ/.test(normalized),
    /PLACA/.test(normalized),
    /RNTRC/.test(normalized),
    /PISO\s+MINIMO|FRETE/.test(normalized),
    /R\$\s*\d/.test(normalized),
    /DATA\s+DA\s+INFRA/.test(normalized),
    /IDENTIFICA/.test(normalized)
  ].filter(Boolean).length;
}

function capture(text: string, pattern: RegExp) {
  return text.match(pattern)?.[1]?.replace(/\s+/g, " ").trim();
}

function normalizeOcrText(value: string) {
  return value
    .replace(/[|_[\]{}]+/g, " ")
    .replace(/[^\S\r\n]+/g, " ")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 2)
    .join("\n");
}

function cleanLooseField(value?: string, maxLength = 80) {
  if (!value) return undefined;
  const cleaned = value
    .replace(/\s+/g, " ")
    .replace(/\b(?:IDENTIFICA[CÇ][AÃ]O|DOCUMENTA[CÇ][AÃ]O|INFRA[CÇ][AÃ]O|CALCULO|C[ÓO]DIGO|ARTIGO)\b.*$/i, "")
    .replace(/[^\wÀ-ú .,/ºª-]/g, "")
    .trim();
  if (cleaned.length < 3 || cleaned.length > maxLength) return undefined;
  return cleaned;
}

function cleanPersonOrCompanyName(value?: string) {
  const cleaned = cleanLooseField(value, 70);
  if (!cleaned) return undefined;
  if (/\b(?:RUA|ENDERECO|MUNICIPIO|CPF|CNPJ|PLACA|MODELO|DOCUMENTO)\b/i.test(cleaned)) return undefined;
  return cleaned;
}

function normalizeBrazilianDocument(value?: string) {
  if (!value) return undefined;
  const digits = value.replace(/\D/g, "");
  if (digits.length === 14) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  if (digits.length === 11) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  return undefined;
}

function pickLikelyFineAmount(text: string) {
  const values = Array.from(text.matchAll(/R\$\s*([0-9.]+,\d{2})/g)).map((match) => match[1]);
  if (values.length === 0) return undefined;
  const scored = values
    .map((value) => ({ value, amount: parseMoney(value) }))
    .filter((item) => item.amount >= 50 && item.amount <= 500000)
    .sort((left, right) => right.amount - left.amount);
  return scored[0]?.value;
}

function pickFutureDate(text: string) {
  const dates = Array.from(text.matchAll(/\b([0-9]{2}\/[0-9]{2}\/[0-9]{4})\b/g)).map((match) => match[1]);
  if (dates.length === 0) return undefined;
  return dates[dates.length - 1];
}

function extractNameNearDocument(text: string, documentNumber?: string) {
  if (!documentNumber) return undefined;
  const digits = documentNumber.replace(/\D/g, "");
  const lines = text.split(/\r?\n/).map((line) => line.replace(/\s+/g, " ").trim()).filter(Boolean);
  const index = lines.findIndex((line) => line.replace(/\D/g, "").includes(digits.slice(0, 8)));
  const candidates = index >= 0 ? lines.slice(Math.max(0, index - 4), index) : [];
  return candidates
    .reverse()
    .map((line) => cleanPersonOrCompanyName(line.replace(/^NOME\s+/i, "")))
    .find(Boolean);
}

function captureDate(text: string, pattern: RegExp) {
  return capture(text, pattern);
}

function normalizePlate(value?: string) {
  if (!value) return undefined;
  const compact = value.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  return compact.length === 7 ? `${compact.slice(0, 3)}-${compact.slice(3)}` : value.trim().toUpperCase();
}

function inferAuthority(text: string) {
  if (text.includes("SEFAZ")) return "SEFAZ";
  if (text.includes("DETRAN")) return "DETRAN";
  if (text.includes("PRF")) return "PRF";
  if (text.includes("MTE") || text.includes("MINISTERIO DO TRABALHO")) return "MTE";
  return "Orgao informado";
}

function buildExtractedDescription(fields: {
  documentName: string;
  autuadoName?: string;
  autuadoDocument?: string;
  address?: string;
  origin?: string;
  destination?: string;
  distanceKm?: string;
  article?: string;
  code?: string;
  issueDate?: string;
  infractionDate?: string;
  defenseDeadline?: string;
  processNumber?: string;
}) {
  const lines = [
    `Documento ${fields.documentName} lido por triagem inteligente. Conferencia humana obrigatoria antes de defesa/recurso.`,
    fields.processNumber ? `Processo: ${fields.processNumber}.` : "",
    fields.autuadoName || fields.autuadoDocument ? `Autuado: ${[toTitleCase(fields.autuadoName), fields.autuadoDocument].filter(Boolean).join(" - ")}.` : "",
    fields.address ? `Endereco do autuado: ${toTitleCase(fields.address)}.` : "",
    fields.origin || fields.destination || fields.distanceKm ? `Rota/distancia: ${[fields.origin ? `origem ${toTitleCase(fields.origin)}` : "", fields.destination ? `destino ${toTitleCase(fields.destination)}` : "", fields.distanceKm ? `${fields.distanceKm} km` : ""].filter(Boolean).join("; ")}.` : "",
    fields.article || fields.code ? `Enquadramento: ${[fields.article ? `artigo ${fields.article}` : "", fields.code ? `codigo ${fields.code}` : ""].filter(Boolean).join("; ")}.` : "",
    fields.infractionDate || fields.issueDate || fields.defenseDeadline ? `Datas: ${[fields.infractionDate ? `infracao ${fields.infractionDate}` : "", fields.issueDate ? `emissao ${fields.issueDate}` : "", fields.defenseDeadline ? `prazo defesa ${fields.defenseDeadline}` : ""].filter(Boolean).join("; ")}.` : ""
  ].filter(Boolean);
  return lines.join("\n");
}

function toTitleCase(value?: string) {
  if (!value) return "";
  return value.toLowerCase().replace(/(^|\s)([a-zà-ú])/g, (match) => match.toUpperCase());
}

function parseMoney(value: string) {
  const normalized = value.trim().replace(/\./g, "").replace(",", ".");
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : 0;
}

function inferCategory(text: string) {
  if (text.includes("ANTT") || text.includes("CIOT") || text.includes("RNTRC") || text.includes("PISO") || text.includes("FRETE")) return "Transporte";
  if (text.includes("SEFAZ") || text.includes("ICMS") || text.includes("NF") || text.includes("MDF")) return "Fiscal";
  if (text.includes("TRANSITO") || text.includes("DETRAN") || text.includes("PRF") || text.includes("AIT")) return "Transito";
  if (text.includes("TRABALH") || text.includes("MTE")) return "Trabalhista";
  return "Transporte";
}

function inferSubcategory(text: string) {
  if (text.includes("PISO")) return "Piso minimo de frete";
  if (text.includes("CIOT")) return "CIOT";
  if (text.includes("RNTRC")) return "RNTRC";
  if (text.includes("MDF")) return "MDF-e";
  if (text.includes("ICMS")) return "Documento fiscal";
  if (text.includes("VELOCIDADE")) return "Transito";
  return "Classificacao a validar";
}

function formatBytes(sizeBytes: number) {
  if (!sizeBytes) return "tamanho a confirmar";
  if (sizeBytes < 1024 * 1024) return `${Math.round(sizeBytes / 1024)} KB`;
  return `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`;
}

function buildStorageKey(caseId: string, fileName: string) {
  const safeName = fileName.toLowerCase().replace(/[^a-z0-9.-]+/g, "-").replace(/^-|-$/g, "");
  return `cases/${caseId}/${Date.now()}-${safeName || "documento"}`;
}

async function buildDocumentHash(document: SelectedDocument) {
  try {
    if (typeof crypto !== "undefined" && crypto.subtle && typeof fetch !== "undefined") {
      const response = await fetch(document.uri);
      const buffer = await response.arrayBuffer();
      const digest = await crypto.subtle.digest("SHA-256", buffer);
      return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
    }
  } catch {
    // Some native URI providers cannot be read by fetch; keep a stable audit token.
  }
  return pseudoSha256(`${document.name}:${document.mimeType}:${document.sizeBytes}:${document.uri}`);
}

function pseudoSha256(value: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  const seed = (hash >>> 0).toString(16).padStart(8, "0");
  return seed.repeat(8).slice(0, 64);
}

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  keyboardType?: "default" | "numeric" | "decimal-pad";
};

function Field({ label, value, onChangeText, placeholder, autoCapitalize, keyboardType }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        style={styles.input}
        placeholderTextColor="#98a2b3"
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  uploadBox: { borderWidth: 1, borderColor: "#d0d5dd", borderStyle: "dashed", borderRadius: 8, padding: 22, gap: 10, backgroundColor: "#f9fafb" },
  uploadTitle: { color: "#101828", fontWeight: "900", fontSize: 18 },
  body: { color: "#667085", lineHeight: 21 },
  captureActions: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 4 },
  captureButton: { minHeight: 42, borderRadius: 8, borderWidth: 1, borderColor: "#cfd5df", backgroundColor: "#fff", paddingHorizontal: 14, justifyContent: "center", alignItems: "center" },
  captureButtonText: { color: "#405978", fontWeight: "900", fontSize: 13 },
  selectedDocument: { borderWidth: 1, borderColor: "#d6ece5", backgroundColor: "#f2faf7", borderRadius: 8, padding: 12, gap: 6, marginTop: 4 },
  selectedTitle: { color: "#101828", fontWeight: "900", flexShrink: 1 },
  scanActions: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 2 },
  scanButton: { minHeight: 40, borderRadius: 8, backgroundColor: "#405978", paddingHorizontal: 14, justifyContent: "center", alignItems: "center" },
  scanButtonText: { color: "#fff", fontWeight: "900", fontSize: 13 },
  scanSummary: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#dce5ef", borderRadius: 8, padding: 10, gap: 4, marginTop: 4 },
  scanTitle: { color: "#101828", fontWeight: "900", fontSize: 13 },
  scanNote: { color: "#405978", fontSize: 12, lineHeight: 17, fontWeight: "700" },
  scanStatus: { color: "#405978", fontSize: 12, lineHeight: 17, fontWeight: "800" },
  ocrTextBox: { gap: 6, marginTop: 8 },
  ocrHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  smallGhostButton: { borderWidth: 1, borderColor: "#d0d5dd", borderRadius: 8, paddingHorizontal: 10, minHeight: 32, justifyContent: "center", backgroundColor: "#fff" },
  smallGhostButtonText: { color: "#405978", fontWeight: "900", fontSize: 12 },
  ocrPreview: { borderWidth: 1, borderColor: "#dce5ef", backgroundColor: "#fff", borderRadius: 8, padding: 12, color: "#667085", fontWeight: "700" },
  ocrTextArea: { minHeight: 120, paddingTop: 12, textAlignVertical: "top" },
  formGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  field: { minWidth: 240, flex: 1, gap: 6 },
  descriptionField: { gap: 6, marginTop: 12 },
  label: { color: "#344054", fontWeight: "800", fontSize: 12 },
  input: { borderWidth: 1, borderColor: "#d0d5dd", borderRadius: 8, paddingHorizontal: 12, minHeight: 44, color: "#101828", backgroundColor: "#fff" },
  textArea: { minHeight: 96, paddingTop: 12, textAlignVertical: "top" },
  error: { color: "#b42318", fontWeight: "800", marginTop: 12 },
  actions: { alignItems: "flex-end", marginTop: 16 },
  primaryButton: { backgroundColor: "#5c7fa8", borderRadius: 8, minHeight: 44, paddingHorizontal: 18, alignItems: "center", justifyContent: "center" },
  primaryButtonText: { color: "#fff", fontWeight: "900" },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.6 }
});
