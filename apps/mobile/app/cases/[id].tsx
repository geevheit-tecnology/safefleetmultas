import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { addNote, attachDocument, completeDeadline, confirmClosure, confirmDocumentExtraction, createCaseAction, createDeadline, createPrevention, getCase, prepareDocumentExtraction, registerDecision, suggestRelationships, updateCaseStatus, validateRelationship, type CreatePreventionInput, type RelationshipSuggestionSummary } from "../../src/api/client";
import { cases, type RegulatoryCase } from "../../src/data/demo";
import { allowedTransitions, type CaseStatus } from "../../src/domain/workflow";
import { useLanguage } from "../../src/i18n";
import { AppShell } from "../../src/ui/AppShell";
import { InfoCard, Panel, Pill } from "../../src/ui/Primitives";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const maxDocumentSizeBytes = 15 * 1024 * 1024;

type DocumentPhase = {
  type: string;
  label: string;
  followUp: string;
};

type SelectedDocument = {
  name: string;
  type: string;
  mimeType: string;
  sizeBytes: number;
  uri: string;
};

const documentPhases: DocumentPhase[] = [
  { type: "AUTO_INFRACAO", label: "Auto/notificacao", followUp: "Ler campos e validar prazo" },
  { type: "PROTOCOLO_DEFESA", label: "Protocolo", followUp: "Acompanhar resposta" },
  { type: "DEFESA", label: "Defesa", followUp: "Monitorar julgamento" },
  { type: "RECURSO", label: "Recurso", followUp: "Monitorar recurso" },
  { type: "DECISAO", label: "Decisao", followUp: "Atualizar alta" },
  { type: "COMPROVANTE", label: "Comprovante", followUp: "Conferir baixa" }
];
const preventionCategories = new Set<CreatePreventionInput["causeCategory"]>([
  "OPERATIONAL_FAILURE",
  "DOCUMENT_FAILURE",
  "PROCESS_FAILURE",
  "HUMAN_FAILURE",
  "SYSTEM_FAILURE",
  "THIRD_PARTY",
  "UNKNOWN"
]);

function isPreventionCategory(value: string): value is CreatePreventionInput["causeCategory"] {
  return preventionCategories.has(value as CreatePreventionInput["causeCategory"]);
}

export default function CaseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<RegulatoryCase>(cases.find((caseItem) => caseItem.id === id) ?? cases[0]);
  const [reason, setReason] = useState("Avanco operacional validado.");
  const [deadlineType, setDeadlineType] = useState("Validar prazo de defesa");
  const [deadlineDate, setDeadlineDate] = useState("");
  const [deadlineBasis, setDeadlineBasis] = useState("NOT_VERIFIED");
  const [actionTitle, setActionTitle] = useState("Reunir documentacao");
  const [actionPriority, setActionPriority] = useState<"HIGH" | "MEDIUM" | "LOW">("MEDIUM");
  const [actionDueDate, setActionDueDate] = useState("");
  const [causeCategory, setCauseCategory] = useState<CreatePreventionInput["causeCategory"]>("OPERATIONAL_FAILURE");
  const [causeDescription, setCauseDescription] = useState("");
  const [correctiveAction, setCorrectiveAction] = useState("");
  const [preventionPlan, setPreventionPlan] = useState("");
  const [documentName, setDocumentName] = useState("Auto de infracao digitalizado");
  const [documentType, setDocumentType] = useState("AUTO_INFRACAO");
  const [selectedDocument, setSelectedDocument] = useState<SelectedDocument | null>(null);
  const [noteBody, setNoteBody] = useState("");
  const [decisionType, setDecisionType] = useState("DEFERIDO_PARCIAL");
  const [decisionDate, setDecisionDate] = useState("");
  const [decisionAmount, setDecisionAmount] = useState("");
  const [decisionNotes, setDecisionNotes] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState<CaseStatus | null>(null);
  const [updatingDeadlineId, setUpdatingDeadlineId] = useState<string | null>(null);
  const [creatingDeadline, setCreatingDeadline] = useState(false);
  const [creatingAction, setCreatingAction] = useState(false);
  const [creatingPrevention, setCreatingPrevention] = useState(false);
  const [attachingDocument, setAttachingDocument] = useState(false);
  const [addingNote, setAddingNote] = useState(false);
  const [registeringDecision, setRegisteringDecision] = useState(false);
  const [extractingDocumentId, setExtractingDocumentId] = useState<string | null>(null);
  const [confirmingExtractionId, setConfirmingExtractionId] = useState<string | null>(null);
  const [relationshipSuggestions, setRelationshipSuggestions] = useState<RelationshipSuggestionSummary | null>(null);
  const [loadingRelationships, setLoadingRelationships] = useState(false);
  const [validatingRelationshipId, setValidatingRelationshipId] = useState<string | null>(null);
  const [confirmingClosure, setConfirmingClosure] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { codeLabel } = useLanguage();
  const selectedPhase = documentPhases.find((phase) => phase.type === documentType) ?? documentPhases[0];

  useEffect(() => {
    if (!id) return;
    void getCase(id).then((loaded) => {
      if (loaded) setItem(loaded);
    });
  }, [id]);

  const changeStatus = async (status: CaseStatus) => {
    setUpdatingStatus(status);
    setError(null);
    try {
      setItem(await updateCaseStatus(item.id, status, reason));
    } catch {
      setError("Nao foi possivel alterar o status do prontuario.");
    } finally {
      setUpdatingStatus(null);
    }
  };

  const nextStatuses = allowedTransitions[item.status] ?? [];

  const addDeadline = async () => {
    setCreatingDeadline(true);
    setError(null);
    try {
      setItem(await createDeadline({ caseId: item.id, type: deadlineType, dueDate: deadlineDate, basis: deadlineBasis }));
      setDeadlineDate("");
    } catch {
      setError("Nao foi possivel criar o prazo.");
    } finally {
      setCreatingDeadline(false);
    }
  };

  const finishDeadline = async (deadlineId: string) => {
    setUpdatingDeadlineId(deadlineId);
    setError(null);
    try {
      setItem(await completeDeadline(item.id, deadlineId));
    } catch {
      setError("Nao foi possivel concluir o prazo.");
    } finally {
      setUpdatingDeadlineId(null);
    }
  };

  const addAction = async () => {
    setCreatingAction(true);
    setError(null);
    try {
      setItem(await createCaseAction({ caseId: item.id, title: actionTitle, priority: actionPriority, dueDate: actionDueDate }));
      setActionDueDate("");
    } catch {
      setError("Nao foi possivel criar a acao.");
    } finally {
      setCreatingAction(false);
    }
  };

  const setImageDocument = (asset: ImagePicker.ImagePickerAsset, source: "camera" | "gallery") => {
    const name = asset.fileName ?? `${source}-${Date.now()}.jpg`;
    setSelectedDocument({
      name,
      type: documentType,
      mimeType: asset.mimeType ?? "image/jpeg",
      sizeBytes: asset.fileSize ?? 0,
      uri: asset.uri
    });
    if (!documentName.trim() || documentName === "Auto de infracao digitalizado") setDocumentName(name);
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
        type: documentType,
        mimeType: asset.mimeType ?? "application/pdf",
        sizeBytes: asset.size ?? 0,
        uri: asset.uri
      });
      if (!documentName.trim() || documentName === "Auto de infracao digitalizado") setDocumentName(asset.name);
    }
  };

  const addDocument = async () => {
    if (!documentName.trim()) {
      setError("Informe o nome do documento.");
      return;
    }
    if (selectedDocument && selectedDocument.sizeBytes > maxDocumentSizeBytes) {
      setError("Documento excede 15MB.");
      return;
    }
    setAttachingDocument(true);
    setError(null);
    try {
      const source = selectedDocument ?? {
        name: documentName,
        type: documentType,
        mimeType: "application/pdf",
        sizeBytes: 0,
        uri: `manual://${item.id}/${documentType}/${documentName}`
      };
      setItem(
        await attachDocument({
          caseId: item.id,
          name: documentName,
          type: documentType,
          mimeType: source.mimeType,
          sizeBytes: source.sizeBytes,
          sha256: await buildDocumentHash(source.uri),
          storageKey: buildStorageKey(item.id, documentType, source.name)
        })
      );
      setDocumentName(defaultDocumentName(documentType));
      setSelectedDocument(null);
    } catch {
      setError("Nao foi possivel registrar o documento.");
    } finally {
      setAttachingDocument(false);
    }
  };

  const submitNote = async () => {
    setAddingNote(true);
    setError(null);
    try {
      setItem(await addNote(item.id, noteBody));
      setNoteBody("");
    } catch {
      setError("Nao foi possivel registrar a nota.");
    } finally {
      setAddingNote(false);
    }
  };

  const submitDecision = async () => {
    setRegisteringDecision(true);
    setError(null);
    try {
      setItem(
        await registerDecision({
          caseId: item.id,
          type: decisionType,
          date: decisionDate,
          finalAmount: Number(decisionAmount.replace(",", ".")) || 0,
          notes: decisionNotes
        })
      );
      setDecisionDate("");
      setDecisionAmount("");
      setDecisionNotes("");
    } catch {
      setError("Nao foi possivel registrar a decisao.");
    } finally {
      setRegisteringDecision(false);
    }
  };

  const loadRelationshipSuggestions = async () => {
    setLoadingRelationships(true);
    setError(null);
    try {
      setRelationshipSuggestions(await suggestRelationships(item.id));
    } catch {
      setError("Nao foi possivel sugerir relacoes.");
    } finally {
      setLoadingRelationships(false);
    }
  };

  const approveRelationship = async (targetCaseId: string, relationshipType: "POSSIBLE_REPETITION" | "RELATED_CASE") => {
    setValidatingRelationshipId(targetCaseId);
    setError(null);
    try {
      await validateRelationship({ sourceCaseId: item.id, targetCaseId, relationshipType });
      setRelationshipSuggestions((current) =>
        current
          ? {
              ...current,
              suggestions: current.suggestions.map((suggestion) =>
                suggestion.targetCaseId === targetCaseId ? { ...suggestion, alreadyLinked: true } : suggestion
              )
            }
          : current
      );
    } catch {
      setError("Nao foi possivel validar a relacao.");
    } finally {
      setValidatingRelationshipId(null);
    }
  };

  const submitClosureConfirmation = async () => {
    setConfirmingClosure(true);
    setError(null);
    try {
      setItem(await confirmClosure(item.id));
    } catch {
      setError("Nao foi possivel confirmar a alta regulatoria.");
    } finally {
      setConfirmingClosure(false);
    }
  };

  const submitPrevention = async () => {
    setCreatingPrevention(true);
    setError(null);
    try {
      setItem(await createPrevention({ caseId: item.id, causeCategory, causeDescription, correctiveAction, preventionPlan }));
      setCauseDescription("");
      setCorrectiveAction("");
      setPreventionPlan("");
    } catch {
      setError("Nao foi possivel registrar a prevencao.");
    } finally {
      setCreatingPrevention(false);
    }
  };

  const prepareExtraction = async (documentId: string) => {
    setExtractingDocumentId(documentId);
    setError(null);
    try {
      setItem(await prepareDocumentExtraction(item.id, documentId));
    } catch {
      setError("Nao foi possivel preparar o OCR.");
    } finally {
      setExtractingDocumentId(null);
    }
  };

  const confirmExtraction = async (extractionId: string) => {
    setConfirmingExtractionId(extractionId);
    setError(null);
    try {
      setItem(await confirmDocumentExtraction(item.id, extractionId));
    } catch {
      setError("Nao foi possivel confirmar a extracao.");
    } finally {
      setConfirmingExtractionId(null);
    }
  };

  return (
    <AppShell title={item.caseNumber} subtitle={`${item.category} · ${item.subcategory}`}>
      <Stack.Screen options={{ title: item.caseNumber }} />
      <View style={styles.hero}>
        <View style={styles.flex}>
          <Text style={styles.caseNumber}>{item.caseNumber}</Text>
          <Text style={styles.title}>{item.category} · {item.subcategory}</Text>
          <Text style={styles.body}>{item.description}</Text>
        </View>
        <Pill text={`${codeLabel(item.riskLevel)} ${item.riskScore}/100`} tone={item.riskLevel === "CRITICAL" ? "#b42318" : "#5c7fa8"} />
      </View>

      <View style={styles.grid}>
        <InfoCard label="Status" value={codeLabel(item.status)} />
        <InfoCard label="Valor" value={money.format(item.amount)} tone="#b42318" />
        <InfoCard label="Responsavel" value={item.responsible} />
        <InfoCard label="Placa" value={item.vehiclePlate ?? "nao informado"} />
        <InfoCard label="RNTRC" value={item.rntrc ?? "nao informado"} />
        <InfoCard label="Orgao" value={item.authority} />
      </View>

      <Panel title="Avancar status">
        <Text style={styles.body}>Mudanca controlada por matriz de workflow. Cada avanco grava historico e evento de auditoria.</Text>
        <TextInput
          value={reason}
          onChangeText={setReason}
          style={styles.input}
          placeholder="Justificativa operacional"
          placeholderTextColor="#98a2b3"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {nextStatuses.length === 0 ? <Text style={styles.muted}>Nao ha proximos status disponiveis para este prontuario.</Text> : null}
        <View style={styles.actionBar}>
          {nextStatuses.map((status) => (
            <Pressable key={status} disabled={updatingStatus !== null} onPress={() => changeStatus(status)} style={({ pressed }) => [styles.statusButton, pressed && styles.pressed, updatingStatus && styles.disabled]}>
              <Text style={styles.statusButtonText}>{updatingStatus === status ? "Atualizando..." : codeLabel(status)}</Text>
            </Pressable>
          ))}
        </View>
      </Panel>

      <View style={styles.columns}>
        <Panel title="Diagnostico">
          <Text style={styles.itemTitle}>RiskEngine</Text>
          <Text style={styles.body}>
            {item.riskAssessment?.explanation ?? `Score atual ${item.riskScore}/100 (${codeLabel(item.riskLevel)}).`}
          </Text>
          {item.riskAssessment?.factors?.map((factor) => (
            <Text key={factor.factor} style={styles.muted}>
              {factor.factor}: peso {Math.round(factor.weight)} · valor {factor.value}
            </Text>
          ))}
          <Text style={styles.itemTitle}>Base regulatoria</Text>
          <Text style={styles.body}>Fontes oficiais ainda nao verificadas neste ambiente. Qualquer prazo ou enquadramento fica como {codeLabel("NOT_VERIFIED")} ate validacao humana.</Text>
          <Text style={styles.itemTitle}>Reincidencia</Text>
          <Text style={styles.body}>Possivel ocorrencia relacionada por tema. Nao e conclusao juridica automatica.</Text>
          <Pressable disabled={loadingRelationships} onPress={loadRelationshipSuggestions} style={({ pressed }) => [styles.secondaryButton, styles.inlineButton, pressed && styles.pressed, loadingRelationships && styles.disabled]}>
            <Text style={styles.secondaryButtonText}>{loadingRelationships ? "Buscando..." : "Buscar semelhantes"}</Text>
          </Pressable>
          {relationshipSuggestions ? <Text style={styles.muted}>{relationshipSuggestions.message} Validacao humana obrigatoria.</Text> : null}
          {relationshipSuggestions?.suggestions.map((suggestion) => (
            <View key={suggestion.targetCaseId} style={styles.relationRow}>
              <View style={styles.flex}>
                <Text style={styles.itemTitle}>{suggestion.targetCaseNumber} · {suggestion.relationshipType}</Text>
                <Text style={styles.muted}>{suggestion.category} · risco {codeLabel(suggestion.riskLevel)} {suggestion.riskScore}/100 · motivos: {suggestion.reasons.join(", ") || "padrao geral"}</Text>
                <Text style={styles.body}>{suggestion.note}</Text>
              </View>
              {suggestion.alreadyLinked ? (
                <Pill text="VALIDADO" tone="#067647" />
              ) : (
                <Pressable disabled={validatingRelationshipId === suggestion.targetCaseId} onPress={() => approveRelationship(suggestion.targetCaseId, suggestion.relationshipType)} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed, validatingRelationshipId === suggestion.targetCaseId && styles.disabled]}>
                  <Text style={styles.secondaryButtonText}>{validatingRelationshipId === suggestion.targetCaseId ? "Validando..." : "Validar"}</Text>
                </Pressable>
              )}
            </View>
          ))}
        </Panel>

        <Panel title="Alta regulatoria">
          {(item.closureChecklist?.items ?? [
            { key: "finalSituationRegistered", label: "situacao final registrada", done: false },
            { key: "decisionDocumentAttached", label: "decisao/documento anexado", done: false },
            { key: "finalAmountUpdated", label: "valor final atualizado", done: false },
            { key: "obligationsCompleted", label: "obrigacoes cumpridas", done: false },
            { key: "deadlinesClosed", label: "prazos encerrados", done: false },
            { key: "responsibleConfirmed", label: "responsavel confirmou", done: false },
            { key: "historyComplete", label: "historico completo", done: false }
          ]).map((check) => (
            <View key={check.key} style={styles.checkRow}>
              <Text style={styles.checkbox}>{check.done ? "✓" : "□"}</Text>
              <Text style={styles.itemTitle}>{check.label}</Text>
            </View>
          ))}
          <Pressable disabled={confirmingClosure} onPress={submitClosureConfirmation} style={({ pressed }) => [styles.secondaryButton, styles.inlineButton, pressed && styles.pressed, confirmingClosure && styles.disabled]}>
            <Text style={styles.secondaryButtonText}>{confirmingClosure ? "Confirmando..." : "Confirmar responsavel"}</Text>
          </Pressable>
          <Pill text={item.closureChecklist?.readyToClose ? "PRONTO PARA ENCERRAR" : "ALTA INCOMPLETA"} tone={item.closureChecklist?.readyToClose ? "#067647" : "#b76e00"} />
        </Panel>
      </View>

      <Panel title="Prazos">
        <View style={styles.deadlineForm}>
          <TextInput value={deadlineType} onChangeText={setDeadlineType} style={[styles.input, styles.deadlineInput]} placeholder="Tipo de prazo" placeholderTextColor="#98a2b3" />
          <TextInput value={deadlineDate} onChangeText={setDeadlineDate} style={[styles.input, styles.dateInput]} placeholder="YYYY-MM-DD" placeholderTextColor="#98a2b3" />
          <TextInput value={deadlineBasis} onChangeText={setDeadlineBasis} style={[styles.input, styles.deadlineInput]} placeholder="Base legal" placeholderTextColor="#98a2b3" />
          <Pressable disabled={creatingDeadline} onPress={addDeadline} style={({ pressed }) => [styles.statusButton, pressed && styles.pressed, creatingDeadline && styles.disabled]}>
            <Text style={styles.statusButtonText}>{creatingDeadline ? "Criando..." : "Criar prazo"}</Text>
          </Pressable>
        </View>
        {item.deadlines.length === 0 ? <Text style={styles.muted}>Nenhum prazo cadastrado.</Text> : null}
        {item.deadlines.map((deadline) => (
          <View key={deadline.id} style={styles.listRow}>
            <View style={styles.flex}>
              <Text style={styles.itemTitle}>{deadline.type}</Text>
              <Text style={styles.muted}>vence {deadline.dueDate} · {codeLabel(deadline.status)} · alerta {codeLabel(deadline.alertLevel ?? "MONITORING")}</Text>
              <Text style={styles.muted}>base {codeLabel(deadline.basis)} · inicio {deadline.startEvent || "nao informado"} · duracao {deadline.duration || "a validar"}</Text>
            </View>
            <View style={styles.statusArea}>
              <Pill text={`${deadline.daysLeft} dias`} tone={deadline.daysLeft <= 3 ? "#b42318" : "#b76e00"} />
              {deadline.status === "PENDING" ? (
                <Pressable disabled={updatingDeadlineId === deadline.id} onPress={() => finishDeadline(deadline.id)} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed, updatingDeadlineId === deadline.id && styles.disabled]}>
                  <Text style={styles.secondaryButtonText}>{updatingDeadlineId === deadline.id ? "Concluindo..." : "Concluir"}</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ))}
      </Panel>

      <Panel title="Timeline">
        {item.timeline.map((event) => (
          <View key={event.id} style={styles.timelineRow}>
            <Text style={styles.timelineDate}>{event.date}</Text>
            <View style={styles.flex}>
              <Text style={styles.itemTitle}>{event.title}</Text>
              <Text style={styles.body}>{event.description}</Text>
              <Text style={styles.muted}>{event.user}</Text>
            </View>
          </View>
        ))}
      </Panel>

      <Panel title="Notas internas">
        <View style={styles.noteForm}>
          <TextInput
            multiline
            value={noteBody}
            onChangeText={setNoteBody}
            style={[styles.input, styles.noteInput]}
            placeholder="Registrar orientacao, contato, duvida juridica ou decisao operacional."
            placeholderTextColor="#98a2b3"
          />
          <Pressable disabled={addingNote} onPress={submitNote} style={({ pressed }) => [styles.statusButton, pressed && styles.pressed, addingNote && styles.disabled]}>
            <Text style={styles.statusButtonText}>{addingNote ? "Registrando..." : "Registrar nota"}</Text>
          </Pressable>
        </View>
        {item.notes.length === 0 ? <Text style={styles.body}>Nenhuma nota interna registrada.</Text> : null}
        {item.notes.map((note) => (
          <View key={note.id} style={styles.noteRow}>
            <Text style={styles.body}>{note.body}</Text>
            <Text style={styles.muted}>{note.author} · {note.createdAt}</Text>
          </View>
        ))}
      </Panel>

      <Panel title="Decisoes">
        <View style={styles.decisionForm}>
          <TextInput value={decisionType} onChangeText={setDecisionType} style={[styles.input, styles.documentTypeInput]} placeholder="Tipo" placeholderTextColor="#98a2b3" />
          <TextInput value={decisionDate} onChangeText={setDecisionDate} style={[styles.input, styles.dateInput]} placeholder="YYYY-MM-DD" placeholderTextColor="#98a2b3" />
          <TextInput value={decisionAmount} onChangeText={setDecisionAmount} style={[styles.input, styles.dateInput]} placeholder="Valor final" placeholderTextColor="#98a2b3" keyboardType="decimal-pad" />
          <TextInput value={decisionNotes} onChangeText={setDecisionNotes} style={[styles.input, styles.decisionNotesInput]} placeholder="Observacao da decisao" placeholderTextColor="#98a2b3" />
          <Pressable disabled={registeringDecision} onPress={submitDecision} style={({ pressed }) => [styles.statusButton, pressed && styles.pressed, registeringDecision && styles.disabled]}>
            <Text style={styles.statusButtonText}>{registeringDecision ? "Registrando..." : "Registrar decisao"}</Text>
          </Pressable>
        </View>
        {item.decisions.length === 0 ? <Text style={styles.body}>Nenhuma decisao registrada.</Text> : null}
        {item.decisions.map((decision) => (
          <View key={decision.id} style={styles.listRow}>
            <View style={styles.flex}>
              <Text style={styles.itemTitle}>{decision.type}</Text>
              <Text style={styles.muted}>{decision.date} · valor final {money.format(decision.finalAmount || 0)}</Text>
              {decision.notes ? <Text style={styles.body}>{decision.notes}</Text> : null}
            </View>
            <Pill text="DECISAO" tone="#067647" />
          </View>
        ))}
      </Panel>

      <Panel title="Acoes">
        <View style={styles.deadlineForm}>
          <TextInput value={actionTitle} onChangeText={setActionTitle} style={[styles.input, styles.documentInput]} placeholder="Acao operacional" placeholderTextColor="#98a2b3" />
          <TextInput value={actionPriority} onChangeText={(value) => setActionPriority(value === "HIGH" || value === "LOW" ? value : "MEDIUM")} style={styles.documentTypeInput} placeholder="Prioridade" placeholderTextColor="#98a2b3" />
          <TextInput value={actionDueDate} onChangeText={setActionDueDate} style={styles.dateInput} placeholder="YYYY-MM-DD" placeholderTextColor="#98a2b3" />
          <Pressable disabled={creatingAction} onPress={addAction} style={({ pressed }) => [styles.statusButton, pressed && styles.pressed, creatingAction && styles.disabled]}>
            <Text style={styles.statusButtonText}>{creatingAction ? "Criando..." : "Criar acao"}</Text>
          </Pressable>
        </View>
        {item.actions.map((action) => (
          <View key={action.id} style={styles.listRow}>
            <View style={styles.flex}>
              <Text style={styles.itemTitle}>{action.title}</Text>
              <Text style={styles.muted}>{codeLabel(action.priority)} · {action.dueDate || "sem prazo"} · {action.responsible ?? "Nao definido"}</Text>
              {action.completedAt ? <Text style={styles.muted}>concluida em {action.completedAt}</Text> : null}
            </View>
            <Pill text={codeLabel(action.status)} tone={action.priority === "HIGH" ? "#b42318" : "#5c7fa8"} />
          </View>
        ))}
      </Panel>

      <Panel title="Prevencao">
        <View style={styles.noteForm}>
          <TextInput value={causeCategory} onChangeText={(value) => setCauseCategory(isPreventionCategory(value) ? value : "UNKNOWN")} style={styles.input} placeholder="Categoria da causa" placeholderTextColor="#98a2b3" />
          <TextInput value={causeDescription} onChangeText={setCauseDescription} style={[styles.input, styles.noteInput]} multiline placeholder="Causa raiz" placeholderTextColor="#98a2b3" />
          <TextInput value={correctiveAction} onChangeText={setCorrectiveAction} style={[styles.input, styles.noteInput]} multiline placeholder="Acao corretiva" placeholderTextColor="#98a2b3" />
          <TextInput value={preventionPlan} onChangeText={setPreventionPlan} style={[styles.input, styles.noteInput]} multiline placeholder="Plano preventivo" placeholderTextColor="#98a2b3" />
          <Pressable disabled={creatingPrevention} onPress={submitPrevention} style={({ pressed }) => [styles.statusButton, pressed && styles.pressed, creatingPrevention && styles.disabled]}>
            <Text style={styles.statusButtonText}>{creatingPrevention ? "Registrando..." : "Registrar prevencao"}</Text>
          </Pressable>
        </View>
        {item.preventions.length === 0 ? <Text style={styles.body}>Nenhuma analise de causa registrada.</Text> : null}
        {item.preventions.map((prevention) => (
          <View key={prevention.id} style={styles.noteRow}>
            <Text style={styles.itemTitle}>{codeLabel(prevention.causeCategory)} · {prevention.createdAt}</Text>
            <Text style={styles.body}>Causa: {prevention.causeDescription}</Text>
            <Text style={styles.body}>Acao corretiva: {prevention.correctiveAction}</Text>
            <Text style={styles.body}>Prevencao: {prevention.preventionPlan}</Text>
          </View>
        ))}
      </Panel>

      <Panel title="Documentos">
        <Text style={styles.body}>Anexe cada fase no prontuario. Protocolo, defesa, recurso e decisao entram na linha de vida e geram acompanhamento operacional.</Text>
        <View style={styles.phaseGrid}>
          {documentPhases.map((phase) => (
            <Pressable
              key={phase.type}
              onPress={() => {
                setDocumentType(phase.type);
                setDocumentName(defaultDocumentName(phase.type));
                setSelectedDocument((current) => (current ? { ...current, type: phase.type } : current));
              }}
              style={({ pressed }) => [styles.phaseButton, documentType === phase.type && styles.phaseButtonActive, pressed && styles.pressed]}
            >
              <Text style={[styles.phaseButtonText, documentType === phase.type && styles.phaseButtonTextActive]}>{phase.label}</Text>
              <Text style={[styles.phaseHint, documentType === phase.type && styles.phaseHintActive]}>{phase.followUp}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.documentForm}>
          <TextInput value={documentName} onChangeText={setDocumentName} style={[styles.input, styles.documentInput]} placeholder="Nome do documento" placeholderTextColor="#98a2b3" />
          <Pressable onPress={takePhoto} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
            <Text style={styles.secondaryButtonText}>Tirar foto</Text>
          </Pressable>
          <Pressable onPress={chooseImage} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
            <Text style={styles.secondaryButtonText}>Imagem</Text>
          </Pressable>
          <Pressable onPress={choosePdf} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
            <Text style={styles.secondaryButtonText}>PDF</Text>
          </Pressable>
          <Pressable disabled={attachingDocument} onPress={addDocument} style={({ pressed }) => [styles.statusButton, pressed && styles.pressed, attachingDocument && styles.disabled]}>
            <Text style={styles.statusButtonText}>{attachingDocument ? "Anexando..." : "Anexar no prontuario"}</Text>
          </Pressable>
        </View>
        {selectedDocument ? (
          <Text style={styles.muted}>Selecionado: {selectedDocument.name} · {formatBytes(selectedDocument.sizeBytes)} · {selectedPhase.label}</Text>
        ) : (
          <Text style={styles.muted}>Sem arquivo selecionado. O registro manual fica marcado no prontuario para posterior conferencia.</Text>
        )}
        {item.documents.length === 0 ? <Text style={styles.body}>Nenhum documento anexado.</Text> : null}
        {item.documents.map((doc) => (
          <View key={doc.id} style={styles.listRow}>
            <View style={styles.flex}>
              <Text style={styles.itemTitle}>{doc.name}</Text>
              <Text style={styles.muted}>{documentTypeLabel(doc.type)} · v{doc.version} · Arquivo protegido</Text>
            </View>
            <View style={styles.statusArea}>
              <Pill text={codeLabel("S3_KEY")} tone="#405978" />
              {doc.type === "AUTO_INFRACAO" ? (
                <Pressable disabled={extractingDocumentId === doc.id} onPress={() => prepareExtraction(doc.id)} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed, extractingDocumentId === doc.id && styles.disabled]}>
                  <Text style={styles.secondaryButtonText}>{extractingDocumentId === doc.id ? "Preparando..." : "Preparar OCR"}</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ))}
      </Panel>

      <Panel title="Upload inteligente">
        <Text style={styles.body}>OCR preparado em modo seguro. Dados extraidos ficam pendentes ate confirmacao humana.</Text>
        {item.aiExtractions.length === 0 ? <Text style={styles.body}>Nenhuma extracao preparada.</Text> : null}
        {item.aiExtractions.map((extraction) => (
          <View key={extraction.id} style={styles.noteRow}>
            <View style={styles.listRowFlat}>
              <View style={styles.flex}>
                <Text style={styles.itemTitle}>{extraction.documentName}</Text>
                <Text style={styles.muted}>{extraction.provider} · {codeLabel(extraction.status)}</Text>
              </View>
              <Pill text={codeLabel(extraction.status)} tone={extraction.status === "CONFIRMED" ? "#067647" : "#b76e00"} />
            </View>
            <ExtractionData data={extraction.extractedData} />
            {extraction.status !== "CONFIRMED" ? (
              <Pressable disabled={confirmingExtractionId === extraction.id} onPress={() => confirmExtraction(extraction.id)} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed, confirmingExtractionId === extraction.id && styles.disabled]}>
                <Text style={styles.secondaryButtonText}>{confirmingExtractionId === extraction.id ? "Confirmando..." : "Confirmar extracao"}</Text>
              </Pressable>
            ) : null}
          </View>
        ))}
      </Panel>

      <Panel title="Auditoria">
        {item.timeline.map((event) => (
          <Text key={`audit-${event.id}`} style={styles.muted}>append-only · {event.date} · {event.user} · {event.title}</Text>
        ))}
      </Panel>
    </AppShell>
  );
}

function defaultDocumentName(type: string) {
  const labels: Record<string, string> = {
    AUTO_INFRACAO: "Auto de infracao digitalizado",
    PROTOCOLO_DEFESA: "Protocolo de defesa",
    DEFESA: "Defesa apresentada",
    RECURSO: "Recurso apresentado",
    DECISAO: "Decisao recebida",
    COMPROVANTE: "Comprovante operacional"
  };
  return labels[type] ?? "Documento do prontuario";
}

function documentTypeLabel(type: string) {
  return documentPhases.find((phase) => phase.type === type)?.label ?? type.replace(/_/g, " ").toLowerCase();
}

function buildStorageKey(caseId: string, type: string, name: string) {
  const safeName = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return `cases/${caseId}/${type.toLowerCase()}/${Date.now()}-${safeName || "documento"}`;
}

async function buildDocumentHash(uri: string) {
  if (uri.startsWith("manual://")) return pseudoSha256(uri);
  try {
    const response = await fetch(uri);
    const buffer = await response.arrayBuffer();
    if (globalThis.crypto?.subtle) {
      const digest = await globalThis.crypto.subtle.digest("SHA-256", buffer);
      return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
    }
  } catch {
    return pseudoSha256(uri);
  }
  return pseudoSha256(uri);
}

function pseudoSha256(value: string) {
  let seed = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    seed ^= value.charCodeAt(index);
    seed = Math.imul(seed, 0x01000193);
  }
  return Array.from({ length: 64 }, (_, index) => ((seed >>> ((index % 4) * 8)) & 0xff).toString(16).padStart(2, "0")).join("");
}

function formatBytes(size: number) {
  if (!size) return "tamanho nao informado";
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function ExtractionData({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data).filter(([key, value]) => key !== "validationRequired" && key !== "notes" && value !== undefined && value !== "");
  if (entries.length === 0) return <Text style={styles.body}>Sem campos estruturados para exibir.</Text>;
  return (
    <View style={styles.extractionGrid}>
      {entries.map(([key, value]) => (
        <View key={key} style={styles.extractionCell}>
          <Text style={styles.extractionLabel}>{fieldLabel(key)}</Text>
          <Text style={styles.extractionValue}>{String(value)}</Text>
        </View>
      ))}
    </View>
  );
}

function fieldLabel(key: string) {
  const labels: Record<string, string> = {
    infractionNumber: "Auto",
    category: "Categoria",
    subcategory: "Subcategoria",
    vehiclePlate: "Placa",
    amount: "Valor",
    confidence: "Confianca",
    documentName: "Documento"
  };
  return labels[key] ?? key.replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim();
}

const styles = StyleSheet.create({
  hero: { backgroundColor: "#fff", borderRadius: 8, borderWidth: 1, borderColor: "#e4e7ec", padding: 18, gap: 12, flexDirection: "row", alignItems: "flex-start", flexWrap: "wrap" },
  caseNumber: { color: "#5c7fa8", fontWeight: "900", fontSize: 13 },
  title: { color: "#101828", fontSize: 24, fontWeight: "900" },
  body: { color: "#667085", lineHeight: 20 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  columns: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  timelineRow: { flexDirection: "row", gap: 12, paddingTop: 10, borderTopColor: "#f2f4f7", borderTopWidth: 1 },
  timelineDate: { width: 74, color: "#344054", fontWeight: "800", fontSize: 12 },
  flex: { flex: 1, minWidth: 0 },
  itemTitle: { color: "#101828", fontWeight: "800", flexShrink: 1 },
  muted: { color: "#667085", fontSize: 12, flexShrink: 1 },
  error: { color: "#b42318", fontWeight: "800" },
  input: { borderWidth: 1, borderColor: "#d0d5dd", borderRadius: 8, paddingHorizontal: 12, minHeight: 44, color: "#101828", backgroundColor: "#fff" },
  actionBar: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  deadlineForm: { flexDirection: "row", flexWrap: "wrap", gap: 10, alignItems: "center" },
  documentForm: { flexDirection: "row", flexWrap: "wrap", gap: 10, alignItems: "center" },
  phaseGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  phaseButton: { borderWidth: 1, borderColor: "#d0d5dd", borderRadius: 8, padding: 10, minWidth: 142, flexGrow: 1, backgroundColor: "#fff" },
  phaseButtonActive: { borderColor: "#5c7fa8", backgroundColor: "#f3f7fb" },
  phaseButtonText: { color: "#344054", fontWeight: "900", fontSize: 12 },
  phaseButtonTextActive: { color: "#405978" },
  phaseHint: { color: "#667085", fontSize: 11, marginTop: 3 },
  phaseHintActive: { color: "#405978" },
  decisionForm: { flexDirection: "row", flexWrap: "wrap", gap: 10, alignItems: "center" },
  noteForm: { gap: 10, alignItems: "flex-start" },
  deadlineInput: { minWidth: 190, flex: 1 },
  documentInput: { minWidth: 220, flex: 1 },
  documentTypeInput: { width: 160 },
  noteInput: { minHeight: 86, alignSelf: "stretch", paddingTop: 12, textAlignVertical: "top" },
  decisionNotesInput: { minWidth: 220, flex: 1 },
  dateInput: { width: 132 },
  statusButton: { minHeight: 38, borderRadius: 8, backgroundColor: "#5c7fa8", paddingHorizontal: 12, alignItems: "center", justifyContent: "center" },
  statusButtonText: { color: "#fff", fontWeight: "900", fontSize: 12 },
  statusArea: { alignItems: "flex-end", gap: 8 },
  secondaryButton: { minHeight: 34, borderRadius: 8, borderWidth: 1, borderColor: "#5c7fa8", paddingHorizontal: 12, alignItems: "center", justifyContent: "center" },
  secondaryButtonText: { color: "#5c7fa8", fontWeight: "900", fontSize: 12 },
  inlineButton: { alignSelf: "flex-start", marginTop: 10 },
  relationRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#f2f4f7", minWidth: 0 },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.55 },
  listRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingTop: 10, borderTopColor: "#f2f4f7", borderTopWidth: 1, minWidth: 0 },
  listRowFlat: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, minWidth: 0 },
  noteRow: { gap: 4, paddingTop: 10, borderTopColor: "#f2f4f7", borderTopWidth: 1 },
  extractionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  extractionCell: { borderWidth: 1, borderColor: "#edf1f5", borderRadius: 8, padding: 8, minWidth: 132, backgroundColor: "#fbfcfe" },
  extractionLabel: { color: "#667085", fontSize: 11, fontWeight: "800" },
  extractionValue: { color: "#101828", fontSize: 12, fontWeight: "800", marginTop: 2 },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 8 },
  checkbox: { color: "#667085", fontSize: 18, fontWeight: "900" }
});
