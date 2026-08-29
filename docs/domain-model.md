# Modelo de Dominio

A entidade central e `regulatory_case`, tratada como prontuario regulatorio, nao como simples multa.

Estados permitidos: RECEIVED, TRIAGE, ANALYSIS, ACTION_REQUIRED, IN_TREATMENT, WAITING_DOCUMENTS, WAITING_EXTERNAL, DECISION, APPEAL, FINALIZATION e CLOSED.

Conclusoes juridicas e reincidencia exigem validacao humana. O sistema pode sugerir relacao entre ocorrencias, mas deve usar linguagem de apoio.
