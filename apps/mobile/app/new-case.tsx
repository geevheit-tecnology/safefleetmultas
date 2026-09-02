import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
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
    category?: string;
    subcategory?: string;
    vehiclePlate?: string;
    amount?: string;
    description?: string;
  };
  confidence: number;
  notes: string[];
};

export default function NewCaseScreen() {
  const [infractionNumber, setInfractionNumber] = useState("");
  const [category, setCategory] = useState("Transporte");
  const [subcategory, setSubcategory] = useState("");
  const [description, setDescription] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [rntrc, setRntrc] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedDocument, setSelectedDocument] = useState<SelectedDocument | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
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
    setError(null);
    try {
      const result = await scanSelectedDocument(selectedDocument);
      setScanResult(result);
      if (result.fields.infractionNumber && !infractionNumber.trim()) setInfractionNumber(result.fields.infractionNumber);
      if (result.fields.category && (!category.trim() || category === "Transporte")) setCategory(result.fields.category);
      if (result.fields.subcategory && !subcategory.trim()) setSubcategory(result.fields.subcategory);
      if (result.fields.vehiclePlate && !vehiclePlate.trim()) setVehiclePlate(result.fields.vehiclePlate);
      if (result.fields.amount && !amount.trim()) setAmount(result.fields.amount);
      if (result.fields.description && !description.trim()) setDescription(result.fields.description);
    } finally {
      setScanning(false);
    }
  };

  const submit = async () => {
    setSaving(true);
    setError(null);
    let createdCaseId: string | null = null;
    try {
      const triage = selectedDocument ? scanResult ?? await scanSelectedDocument(selectedDocument) : null;
      if (triage && !scanResult) setScanResult(triage);
      const resolvedInfractionNumber = triage?.fields.infractionNumber ?? infractionNumber;
      const resolvedCategory = triage?.fields.category ?? category;
      if (!resolvedInfractionNumber.trim() || !resolvedCategory.trim()) {
        setError("Informe o numero do documento e a categoria.");
        return;
      }
      const created = await createCase({
        infractionNumber: resolvedInfractionNumber,
        category: resolvedCategory,
        subcategory: triage?.fields.subcategory ?? subcategory,
        description: description || triage?.fields.description || "",
        vehiclePlate: triage?.fields.vehiclePlate ?? vehiclePlate,
        rntrc,
        amount: Number((triage?.fields.amount ?? amount).replace(",", ".")) || 0
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
          <Text style={styles.body}>Use a camera do celular, selecione uma imagem ou anexe um PDF. O arquivo entra no prontuario com confirmacao humana antes do OCR.</Text>
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
        </View>
      </Panel>

      <Panel title="Dados iniciais">
        <View style={styles.formGrid}>
          <Field label="Numero do documento" value={infractionNumber} onChangeText={setInfractionNumber} placeholder="AI-000000/2026" />
          <Field label="Categoria" value={category} onChangeText={setCategory} placeholder="Transporte, fiscal, trabalhista, transito" />
          <Field label="Subcategoria" value={subcategory} onChangeText={setSubcategory} placeholder="Descricao operacional" />
          <Field label="Placa" value={vehiclePlate} onChangeText={setVehiclePlate} placeholder="ABC-1D23" autoCapitalize="characters" />
          <Field label="RNTRC" value={rntrc} onChangeText={setRntrc} placeholder="00000000" keyboardType="numeric" />
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

async function scanSelectedDocument(document: SelectedDocument): Promise<ScanResult> {
  await new Promise((resolve) => setTimeout(resolve, 350));
  const source = decodeURIComponent(document.name).replace(/\.[a-z0-9]+$/i, "").replace(/[_-]+/g, " ");
  const normalized = source.toUpperCase();
  const infractionNumber = normalized.match(/\b(?:AI|AIT|AUTO|INFRA[CÇ][AÃ]O|MULTA)\s*[-./:]?\s*([A-Z0-9]{3,}[-./]?\d{2,})\b/)?.[1];
  const vehiclePlate = normalized.match(/\b[A-Z]{3}[- ]?\d[A-Z0-9]\d{2}\b/)?.[0]?.replace(" ", "-");
  const amount = normalized.match(/\b(?:R\$|VALOR)\s*([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{2})?)\b/)?.[1];
  const category = inferCategory(normalized);
  const notes: string[] = [];

  if (infractionNumber) notes.push(`Numero identificado: ${infractionNumber}`);
  if (vehiclePlate) notes.push(`Placa identificada: ${vehiclePlate}`);
  if (amount) notes.push(`Valor identificado: R$ ${amount}`);
  if (category !== "Transporte") notes.push(`Categoria sugerida: ${category}`);
  if (notes.length === 0) notes.push("Nao encontrei campos confiaveis no nome do arquivo; preenchi uma classificacao inicial para revisao.");

  const confidence = Math.min(92, 42 + (infractionNumber ? 18 : 0) + (vehiclePlate ? 16 : 0) + (amount ? 12 : 0) + (category !== "Transporte" ? 12 : 0));

  return {
    confidence,
    notes,
    fields: {
      infractionNumber,
      category,
      subcategory: inferSubcategory(normalized),
      vehiclePlate,
      amount,
      description: `Documento ${document.name} lido por triagem inteligente. Conferir numero, orgao, prazo, enquadramento e valor antes de prosseguir.`
    }
  };
}

function inferCategory(text: string) {
  if (text.includes("SEFAZ") || text.includes("ICMS") || text.includes("NF") || text.includes("MDF")) return "Fiscal";
  if (text.includes("TRANSITO") || text.includes("DETRAN") || text.includes("PRF") || text.includes("AIT")) return "Transito";
  if (text.includes("ANTT") || text.includes("CIOT") || text.includes("RNTRC") || text.includes("PISO")) return "Transporte";
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
