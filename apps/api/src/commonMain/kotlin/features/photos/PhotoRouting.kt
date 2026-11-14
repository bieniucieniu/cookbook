package com.bieniucieniu.cookbook.features.photos

import com.bieniucieniu.cookbook.core.http.ApiException
import com.bieniucieniu.cookbook.core.http.ErrorBody
import com.bieniucieniu.cookbook.features.auth.SessionReader
import com.bieniucieniu.cookbook.features.recipes.domain.PhotoCreated
import com.bieniucieniu.cookbook.features.recipes.domain.PhotoUpload
import io.ktor.http.ContentType
import io.ktor.http.HttpStatusCode
import io.ktor.http.content.PartData
import io.ktor.http.content.forEachPart
import io.ktor.openapi.jsonSchema
import io.ktor.server.response.respond
import io.ktor.server.response.respondBytes
import io.ktor.server.request.receiveMultipart
import io.ktor.server.routing.Route
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import io.ktor.server.routing.openapi.describe
import io.ktor.utils.io.ExperimentalKtorApi
import io.ktor.utils.io.readBuffer
import kotlinx.io.readByteArray
import org.koin.ktor.ext.inject

@OptIn(ExperimentalKtorApi::class)
fun Route.configurePhotoRouting() {
    val photos: PhotoService by inject()
    val sessions: SessionReader by inject()

    post("/photos") {
        val actor = sessions.actor(call) ?: throw ApiException(HttpStatusCode.Unauthorized, listOf("login required"))
        var bytes: ByteArray? = null
        var contentType: String? = null
        call.receiveMultipart().forEachPart { part ->
            if (part.name == "file" && bytes == null) {
                contentType = part.contentType?.toString()
                bytes = when (part) {
                    is PartData.FileItem -> part.provider().readBuffer().readByteArray()
                    is PartData.BinaryChannelItem -> part.provider().readBuffer().readByteArray()
                    else -> null
                }
            }
            part.release()
        }
        val body = bytes ?: throw ApiException(HttpStatusCode.BadRequest, listOf("file is required"))
        call.respond(HttpStatusCode.Created, photos.upload(actor, body, contentType))
    }.describe {
        operationId = "uploadPhoto"
        tag("photos")
        requestBody {
            required = true
            description = "Multipart field file. jpeg, png, or webp."
            ContentType.MultiPart.FormData {
                schema = jsonSchema<PhotoUpload>()
            }
        }
        responses {
            HttpStatusCode.Created { description = "Stored photo"; schema = jsonSchema<PhotoCreated>() }
            HttpStatusCode.BadRequest { description = "Rejected photo"; schema = jsonSchema<ErrorBody>() }
            HttpStatusCode.Unauthorized { description = "Login required"; schema = jsonSchema<ErrorBody>() }
        }
    }

    get("/photos/{id}") {
        val id = call.parameters["id"]?.toLongOrNull()
            ?: throw ApiException(HttpStatusCode.BadRequest, listOf("id must be an integer"))
        val photo = photos.read(sessions.actor(call), id)
        call.respondBytes(photo.bytes, ContentType.parse(photo.contentType))
    }.describe {
        operationId = "getPhoto"
        tag("photos")
        responses {
            HttpStatusCode.OK { description = "Photo bytes" }
            HttpStatusCode.BadRequest { description = "Bad id"; schema = jsonSchema<ErrorBody>() }
            HttpStatusCode.NotFound { description = "Missing photo"; schema = jsonSchema<ErrorBody>() }
        }
    }
}
