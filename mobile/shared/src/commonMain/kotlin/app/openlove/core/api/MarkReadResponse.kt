package app.openlove.core.api

import kotlinx.serialization.Serializable

@Serializable
data class MarkReadResponse(
    val lastReadId: String?,
)
