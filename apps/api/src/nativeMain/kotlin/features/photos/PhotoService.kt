package com.bieniucieniu.cookbook.features.photos

import com.bieniucieniu.cookbook.app.ApiVersion
import com.bieniucieniu.cookbook.core.http.ApiException
import com.bieniucieniu.cookbook.features.auth.Actor
import com.bieniucieniu.cookbook.features.auth.nowSeconds
import com.bieniucieniu.cookbook.features.recipes.RecipeAction
import com.bieniucieniu.cookbook.features.recipes.RecipeRepository
import com.bieniucieniu.cookbook.features.recipes.decide
import com.bieniucieniu.cookbook.features.recipes.domain.PhotoCreated
import com.bieniucieniu.cookbook.features.recipes.photoObjectKey
import com.bieniucieniu.cookbook.features.recipes.visibility
import com.bieniucieniu.cookbook.s3.GetObjectRequest
import com.bieniucieniu.cookbook.s3.PutObjectRequest
import com.bieniucieniu.cookbook.s3.S3Client
import com.bieniucieniu.cookbook.s3.S3Exception
import dev.whyoleg.cryptography.random.CryptographyRandom
import io.ktor.http.HttpStatusCode

class PhotoBytes(val bytes: ByteArray, val contentType: String)

class PhotoService(
    private val recipes: RecipeRepository,
    private val storage: S3Client,
    private val s3: S3Config,
    private val photos: PhotoConfig,
) {
    suspend fun upload(actor: Actor, bytes: ByteArray, contentType: String?): PhotoCreated {
        val rejection = photoRejection(bytes.size, contentType, photos.maxBytes)
        if (rejection != null) throw ApiException(HttpStatusCode.BadRequest, listOf(rejection))
        val type = imageContentType(contentType)!!
        val storageKey = CryptographyRandom.nextBytes(16).toHexString()
        val id = recipes.insertPhoto(actor.userId, storageKey, type, nowSeconds())
        try {
            storage.putObject(
                PutObjectRequest(
                    bucket = s3.bucket,
                    key = photoObjectKey(storageKey),
                    body = bytes,
                    contentType = type,
                ),
            )
        } catch (error: S3Exception) {
            recipes.deletePhoto(id)
            throw ApiException(HttpStatusCode.BadGateway, listOf("photo storage failed"))
        }
        return PhotoCreated(id, "${ApiVersion.V1}/photos/$id")
    }

    suspend fun read(actor: Actor?, id: Long): PhotoBytes {
        val photo = recipes.photo(id) ?: throw ApiException(HttpStatusCode.NotFound, listOf("photo not found"))
        if (photo.recipeId == null) {
            if (actor?.userId != photo.ownerId) throw ApiException(HttpStatusCode.NotFound, listOf("photo not found"))
        } else {
            val recipe = recipes.recipe(photo.recipeId) ?: throw ApiException(HttpStatusCode.NotFound, listOf("photo not found"))
            val grant = if (actor == null) null else recipes.grantFor(recipe.id, actor.userId)
            val denied = decide(
                actor?.userId,
                com.bieniucieniu.cookbook.features.recipes.RecipeAcl(
                    recipe.ownerId,
                    visibility(recipe.visibility),
                    grant,
                ),
                RecipeAction.Read,
            )
            if (denied != null) throw ApiException(HttpStatusCode.NotFound, listOf("photo not found"))
        }
        val stored = try {
            storage.getObject(GetObjectRequest(s3.bucket, photoObjectKey(photo.storageKey)))
        } catch (error: S3Exception) {
            val status = if (error.status == 404) HttpStatusCode.NotFound else HttpStatusCode.BadGateway
            val message = if (error.status == 404) "photo not found" else "photo storage failed"
            throw ApiException(status, listOf(message))
        }
        return PhotoBytes(stored.body, photo.contentType)
    }
}
