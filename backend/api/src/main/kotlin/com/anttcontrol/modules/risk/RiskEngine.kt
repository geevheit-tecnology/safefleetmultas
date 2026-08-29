package com.anttcontrol.modules.risk

enum class RiskLevel { LOW, MEDIUM, HIGH, CRITICAL }

data class RiskThresholds(val lowMax: Int = 24, val mediumMax: Int = 49, val highMax: Int = 74)

class RiskEngine(private val thresholds: RiskThresholds = RiskThresholds()) {
    fun classify(score: Int): RiskLevel = when {
        score <= thresholds.lowMax -> RiskLevel.LOW
        score <= thresholds.mediumMax -> RiskLevel.MEDIUM
        score <= thresholds.highMax -> RiskLevel.HIGH
        else -> RiskLevel.CRITICAL
    }
}
