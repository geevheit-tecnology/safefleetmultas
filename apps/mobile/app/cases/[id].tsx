import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { addNote, attachDocument, completeDeadline, confirmDocumentExtraction, createDeadline, getCase, prepareDocumentExtraction, registerDecision, updateCaseStatus } from "../../src/api/client";
import { cases, type RegulatoryCase } from "../../src/data/demo";
import { allowedTransitions, type CaseStatus } from "../../src/domain/workflow";
import { AppShell } from "../../src/ui/AppShell";
import { InfoCard, Panel, Pill } from "../../src/ui/Primitives";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function CaseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<RegulatoryCase>(cases.find((caseItem) => caseItem.id === id) ?? cases[0]);
  const [reason, setReason] = useState("Avanco operacional validado.");
  const [deadlineType, setDeadlineType] = useState("Validar prazo de defesa");
  const [deadlineDate, setDeadlineDate] = useState("");
  const [deadlineBasis, setDeadlineBasis] = useState("NOT_VERIFIED");
  const [documentName, setDocumentName] = useState("Auto de infracao digitalizado");
  const [documentType, setDocumentType] = useState("AUTO_INFRACAO");
  const [documentStorageKey, setDocumentStorageKey] = useState("");
  const [documentHash, setDocumentHash] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [decisionType, setDecisionType] = useState("DEFERIDO_PARCIAL");
  const [decisionDate, setDecisionDate] = useState("");
  const [decisionAmount, setDecisionAmount] = useState("");
  const [decisionNotes, setDecisionNotes] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState<CaseStatus | null>(null);
  const [updatingDeadlineId, setUpdatingDeadlineId] = useState<string | null>(null);
  const [creatingDeadline, setCreatingDeadline] = useState(false);
  const [attachingDocument, setAttachingDocument] = useState(false);
  const [addingNote, setAddingNote] = useState(false);
  const [registeringDecision, setRegisteringDecision] = useState(false);
  const [extractingDocumentId, setExtractingDocumentId] = useState<string | null>(null);
  const [confirmingExtractionId, setConfirmingExtractionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const addDocument = async () => {
    setAttachingDocument(true);
    setError(null);
    try {
      setItem(
        await attachDocument({
          caseId: item.id,
          name: documentName,
          type: documentType,
          mimeType: "application/pdf",
          sizeBytes: 0,
          sha256: documentHash,
          storageKey: documentStorageKey
        })
      );
      setDocumentStorageKey("");
      setDocumentHash("");
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
        <Pill text={`${item.riskLevel} ${item.riskScore}/100`} tone={item.riskLevel === "CRITICAL" ? "#b42318" : "#175cd3"} />
      </View>

      <View style={styles.grid}>
        <InfoCard label="Status" value={item.status} />
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
              <Text style={styles.statusButtonText}>{updatingStatus === status ? "Atualizando..." : status}</Text>
            </Pressable>
          ))}
        </View>
      </Panel>

      <View style={styles.columns}>
        <Panel title="Diagnostico">
          <Text style={styles.itemTitle}>Base regulatoria</Text>
          <Text style={styles.body}>Fontes oficiais ainda nao verificadas neste ambiente. Qualquer prazo ou enquadramento fica como NOT_VERIFIED ate validacao humana.</Text>
          <Text style={styles.itemTitle}>Reincidencia</Text>
          <Text style={styles.body}>Possivel ocorrencia relacionada por tema. Nao e conclusao juridica automatica.</Text>
        </Panel>

        <Panel title="Alta regulatoria">
          {["Situacao final registrada", "Documento de decisao anexado", "Valor final atualizado", "Prazos encerrados", "Responsavel confirmou"].map((label) => (
            <View key={label} style={styles.checkRow}>
              <Text style={styles.checkbox}>□</Text>
              <Text style={styles.itemTitle}>{label}</Text>
            </View>
          ))}
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
              <Text style={styles.muted}>vence {deadline.dueDate} · {deadline.status} · base {deadline.basis}</Text>
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
        {item.actions.map((action) => (
          <View key={action.id} style={styles.listRow}>
            <View style={styles.flex}>
              <Text style={styles.itemTitle}>{action.title}</Text>
              <Text style={styles.muted}>{action.priority} · {action.dueDate}</Text>
            </View>
            <Pill text={action.status} tone={action.priority === "HIGH" ? "#b42318" : "#175cd3"} />
          </View>
        ))}
      </Panel>

      <Panel title="Documentos">
        <View style={styles.documentForm}>
          <TextInput value={documentName} onChangeText={setDocumentName} style={[styles.input, styles.documentInput]} placeholder="Nome do documento" placeholderTextColor="#98a2b3" />
          <TextInput value={documentType} onChangeText={setDocumentType} style={[styles.input, styles.documentTypeInput]} placeholder="Tipo" placeholderTextColor="#98a2b3" />
          <TextInput value={documentStorageKey} onChangeText={setDocumentStorageKey} style={[styles.input, styles.documentInput]} placeholder="storage/casos/arquivo.pdf" placeholderTextColor="#98a2b3" />
          <TextInput value={documentHash} onChangeText={setDocumentHash} style={[styles.input, styles.documentInput]} placeholder="sha256" placeholderTextColor="#98a2b3" />
          <Pressable disabled={attachingDocument} onPress={addDocument} style={({ pressed }) => [styles.statusButton, pressed && styles.pressed, attachingDocument && styles.disabled]}>
            <Text style={styles.statusButtonText}>{attachingDocument ? "Registrando..." : "Registrar documento"}</Text>
          </Pressable>
        </View>
        {item.documents.length === 0 ? <Text style={styles.body}>Nenhum documento anexado.</Text> : null}
        {item.documents.map((doc) => (
          <View key={doc.id} style={styles.listRow}>
            <View style={styles.flex}>
              <Text style={styles.itemTitle}>{doc.name}</Text>
              <Text style={styles.muted}>{doc.type} · v{doc.version} · {doc.storageKey}</Text>
            </View>
            <View style={styles.statusArea}>
              <Pill text="S3 KEY" tone="#10243f" />
              <Pressable disabled={extractingDocumentId === doc.id} onPress={() => prepareExtraction(doc.id)} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed, extractingDocumentId === doc.id && styles.disabled]}>
                <Text style={styles.secondaryButtonText}>{extractingDocumentId === doc.id ? "Preparando..." : "Preparar OCR"}</Text>
              </Pressable>
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
                <Text style={styles.muted}>{extraction.provider} · {extraction.status}</Text>
              </View>
              <Pill text={extraction.status} tone={extraction.status === "CONFIRMED" ? "#067647" : "#b76e00"} />
            </View>
            <Text style={styles.body}>{JSON.stringify(extraction.extractedData)}</Text>
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

const styles = StyleSheet.create({
  hero: { backgroundColor: "#fff", borderRadius: 8, borderWidth: 1, borderColor: "#e4e7ec", padding: 18, gap: 12, flexDirection: "row", alignItems: "flex-start" },
  caseNumber: { color: "#175cd3", fontWeight: "900", fontSize: 13 },
  title: { color: "#101828", fontSize: 24, fontWeight: "900" },
  body: { color: "#667085", lineHeight: 20 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  columns: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  timelineRow: { flexDirection: "row", gap: 12, paddingTop: 10, borderTopColor: "#f2f4f7", borderTopWidth: 1 },
  timelineDate: { width: 74, color: "#344054", fontWeight: "800", fontSize: 12 },
  flex: { flex: 1 },
  itemTitle: { color: "#101828", fontWeight: "800" },
  muted: { color: "#667085", fontSize: 12 },
  error: { color: "#b42318", fontWeight: "800" },
  input: { borderWidth: 1, borderColor: "#d0d5dd", borderRadius: 8, paddingHorizontal: 12, minHeight: 44, color: "#101828", backgroundColor: "#fff" },
  actionBar: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  deadlineForm: { flexDirection: "row", flexWrap: "wrap", gap: 10, alignItems: "center" },
  documentForm: { flexDirection: "row", flexWrap: "wrap", gap: 10, alignItems: "center" },
  decisionForm: { flexDirection: "row", flexWrap: "wrap", gap: 10, alignItems: "center" },
  noteForm: { gap: 10, alignItems: "flex-start" },
  deadlineInput: { minWidth: 190, flex: 1 },
  documentInput: { minWidth: 220, flex: 1 },
  documentTypeInput: { width: 160 },
  noteInput: { minHeight: 86, alignSelf: "stretch", paddingTop: 12, textAlignVertical: "top" },
  decisionNotesInput: { minWidth: 220, flex: 1 },
  dateInput: { width: 132 },
  statusButton: { minHeight: 38, borderRadius: 8, backgroundColor: "#175cd3", paddingHorizontal: 12, alignItems: "center", justifyContent: "center" },
  statusButtonText: { color: "#fff", fontWeight: "900", fontSize: 12 },
  statusArea: { alignItems: "flex-end", gap: 8 },
  secondaryButton: { minHeight: 34, borderRadius: 8, borderWidth: 1, borderColor: "#175cd3", paddingHorizontal: 12, alignItems: "center", justifyContent: "center" },
  secondaryButtonText: { color: "#175cd3", fontWeight: "900", fontSize: 12 },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.55 },
  listRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingTop: 10, borderTopColor: "#f2f4f7", borderTopWidth: 1 },
  listRowFlat: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  noteRow: { gap: 4, paddingTop: 10, borderTopColor: "#f2f4f7", borderTopWidth: 1 },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 8 },
  checkbox: { color: "#667085", fontSize: 18, fontWeight: "900" }
});
