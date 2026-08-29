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

        private fun normalizeJdbcUrl(url: String): String =
            if (url.startsWith("jdbc:")) url else "jdbc:$url"
    }
}
