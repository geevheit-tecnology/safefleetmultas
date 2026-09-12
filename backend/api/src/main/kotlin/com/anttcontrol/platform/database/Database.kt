package com.anttcontrol.platform.database

import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource
import java.sql.Connection

class Database(private val dataSource: HikariDataSource?) {
    val enabled: Boolean = dataSource != null

    fun <T> query(block: (Connection) -> T): T {
        val source = dataSource ?: error("DATABASE_URL nao configurada")
        return source.connection.use(block)
    }

    companion object {
        fun fromEnv(): Database {
            val url = System.getenv("DATABASE_URL")?.takeIf { it.isNotBlank() } ?: return Database(null)
            val config = HikariConfig().apply {
                jdbcUrl = normalizeJdbcUrl(url)
                maximumPoolSize = System.getenv("DB_POOL_SIZE")?.toIntOrNull() ?: 5
                poolName = "antt-control-api"
            }
            return Database(HikariDataSource(config))
        }

        private fun normalizeJdbcUrl(url: String): String {
            if (url.startsWith("jdbc:")) return url
            
            // Converte postgresql://user:pass@host:port/db para jdbc:postgresql://host:port/db?user=user&password=pass
            val regex = Regex("postgresql://([^:]+):([^@]+)@([^/]+)/(.+)")
            val match = regex.matchEntire(url)
            
            if (match != null) {
                val (user, pass, host, dbAndParams) = match.destructured
                val separator = if (dbAndParams.contains("?")) "&" else "?"
                return "jdbc:postgresql://$host/$dbAndParams${separator}user=$user&password=$pass"
            }
            
            return "jdbc:$url"
        }
    }
}
