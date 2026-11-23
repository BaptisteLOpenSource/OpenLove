package app.openlove.core.api

import kotlinx.serialization.Serializable

@Serializable
data class PushConfig(
    val projectId: String,
    val apiKey: String,
    val messagingSenderId: String,
    val androidAppId: String,
)

@Serializable
data class RegisterPushTokenResponse(
    val registered: Boolean,
)
