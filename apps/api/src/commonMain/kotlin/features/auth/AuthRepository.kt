package com.bieniucieniu.cookbook.features.auth

import app.cash.sqldelight.async.coroutines.awaitAsOneOrNull
import com.bieniucieniu.cookbook.core.database.sql
import com.bieniucieniu.cookbook.core.database.tx
import com.bieniucieniu.cookbook.db.CookbookDatabase
import io.github.smyrgeorge.sqlx4k.impl.extensions.asLong
import io.github.smyrgeorge.sqlx4k.postgres.IPostgresSQL

data class LocalUser(
    val id: Long,
    val workosUserId: String,
    val email: String,
    val firstName: String,
    val lastName: String,
)

data class LocalSession(
    val userId: Long,
    val expiresAt: Long,
    val workosSessionId: String?,
)

data class AuthAttempt(
    val state: String,
    val codeVerifier: String,
    val expiresAt: Long,
)

class AuthRepository(
    private val database: CookbookDatabase,
    private val postgres: IPostgresSQL,
) {
    suspend fun upsertUser(workosUserId: String, email: String, firstName: String, lastName: String): LocalUser =
        postgres.tx {
            val row = fetchAll(
                sql(
                    """
                    INSERT INTO users (workos_user_id, email, first_name, last_name)
                    VALUES (:workos_user_id, :email, :first_name, :last_name)
                    ON CONFLICT (workos_user_id) DO UPDATE SET
                      email = EXCLUDED.email,
                      first_name = EXCLUDED.first_name,
                      last_name = EXCLUDED.last_name
                    RETURNING id, workos_user_id, email, first_name, last_name
                    """.trimIndent(),
                    mapOf(
                        "workos_user_id" to workosUserId,
                        "email" to email,
                        "first_name" to firstName,
                        "last_name" to lastName,
                    ),
                ),
            ).getOrThrow().single()
            LocalUser(
                row.get("id").asLong(),
                row.get("workos_user_id").asString(),
                row.get("email").asString(),
                row.get("first_name").asString(),
                row.get("last_name").asString(),
            )
        }

    suspend fun userByEmail(email: String): LocalUser? =
        database.authQueries.userByEmail(email).awaitAsOneOrNull()?.let {
            LocalUser(it.id, it.workos_user_id, it.email, it.first_name, it.last_name)
        }

    suspend fun userById(id: Long): LocalUser? =
        database.authQueries.userById(id).awaitAsOneOrNull()?.let {
            LocalUser(it.id, it.workos_user_id, it.email, it.first_name, it.last_name)
        }

    suspend fun insertSession(userId: Long, tokenHash: String, workosSessionId: String?, expiresAt: Long) {
        postgres.tx {
            execute(
                sql(
                    """
                    INSERT INTO sessions (user_id, token_hash, workos_session_id, expires_at)
                    VALUES (:user_id, :token_hash, :workos_session_id, :expires_at)
                    """.trimIndent(),
                    mapOf(
                        "user_id" to userId,
                        "token_hash" to tokenHash,
                        "workos_session_id" to workosSessionId,
                        "expires_at" to expiresAt,
                    ),
                ),
            ).getOrThrow()
        }
    }

    suspend fun session(tokenHash: String): LocalSession? =
        database.authQueries.sessionByHash(tokenHash).awaitAsOneOrNull()?.let {
            LocalSession(it.user_id, it.expires_at, it.workos_session_id)
        }

    suspend fun deleteSession(tokenHash: String) {
        database.authQueries.deleteSession(tokenHash)
    }

    suspend fun insertAttempt(state: String, codeVerifier: String, expiresAt: Long) {
        postgres.tx {
            execute(
                sql(
                    """
                    INSERT INTO auth_attempts (state, code_verifier, expires_at)
                    VALUES (:state, :code_verifier, :expires_at)
                    """.trimIndent(),
                    mapOf(
                        "state" to state,
                        "code_verifier" to codeVerifier,
                        "expires_at" to expiresAt,
                    ),
                ),
            ).getOrThrow()
        }
    }

    suspend fun attempt(state: String): AuthAttempt? =
        database.authQueries.attemptByState(state).awaitAsOneOrNull()?.let {
            AuthAttempt(it.state, it.code_verifier, it.expires_at)
        }

    suspend fun deleteAttempt(state: String) {
        database.authQueries.deleteAttempt(state)
    }
}
