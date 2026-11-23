package com.bieniucieniu.cookbook.core.database

import com.bieniucieniu.cookbook.core.http.mapSql
import io.github.smyrgeorge.sqlx4k.QueryExecutor
import io.github.smyrgeorge.sqlx4k.Statement
import io.github.smyrgeorge.sqlx4k.postgres.IPostgresSQL

internal fun sql(text: String, args: Map<String, Any?> = emptyMap()): Statement {
    var statement = Statement.create(text)
    for ((name, value) in args) {
        statement = statement.bind(name, value)
    }
    return statement
}

/** Runs a multi-statement write in one transaction, with SQL errors mapped to [ApiException][com.bieniucieniu.cookbook.core.http.ApiException]. */
internal suspend fun <T> IPostgresSQL.tx(block: suspend QueryExecutor.() -> T): T =
    mapped { transaction { block() } }

/** Runs a single statement with SQL errors mapped, without the BEGIN/COMMIT round trips of [tx]. */
internal suspend fun <T> IPostgresSQL.mapped(block: suspend IPostgresSQL.() -> T): T =
    try {
        block()
    } catch (error: Throwable) {
        throw mapSql(error)
    }
