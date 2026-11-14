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

internal suspend fun <T> IPostgresSQL.tx(block: suspend QueryExecutor.() -> T): T =
    try {
        transaction { block() }
    } catch (error: Throwable) {
        throw mapSql(error)
    }
