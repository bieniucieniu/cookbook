package com.bieniucieniu.cookbook.workos

open class WorkOSException(
    message: String,
    val status: Int,
    val code: String?,
    val requestId: String?,
    cause: Throwable? = null,
) : RuntimeException(message, cause)

class ApiKeyRequiredException(method: String) : WorkOSException(
    message = "API key required for $method",
    status = 0,
    code = "api_key_required",
    requestId = null,
)

class BadRequestException(message: String, code: String?, requestId: String?) : WorkOSException(message, 400, code, requestId)

class UnauthorizedException(message: String, code: String?, requestId: String?) : WorkOSException(message, 401, code, requestId)

class NotFoundException(message: String, code: String?, requestId: String?) : WorkOSException(message, 404, code, requestId)

class UnprocessableEntityException(message: String, code: String?, requestId: String?) : WorkOSException(message, 422, code, requestId)

class RateLimitException(
    message: String,
    code: String?,
    requestId: String?,
    val retryAfterSeconds: Long?,
) : WorkOSException(message, 429, code, requestId)

class GenericServerException(message: String, status: Int, code: String?, requestId: String?) : WorkOSException(message, status, code, requestId)

class WorkOSGenericException(message: String, status: Int, code: String?, requestId: String?) : WorkOSException(message, status, code, requestId)

class TransportException(message: String, cause: Throwable) : WorkOSException(message, 0, "transport", null, cause)

class SignatureVerificationException(message: String) : WorkOSException(message, 0, "signature_invalid", null)
