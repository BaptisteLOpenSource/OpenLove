package app.openlove.core.api

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
enum class RevealKind {
    @SerialName("surprise")
    Surprise,

    @SerialName("letter")
    Letter,
}

@Serializable
data class RevealsResponse(
    val items: List<Reveal>,
    val me: String,
)

@Serializable
data class Reveal(
    val id: String,
    val kind: RevealKind,
    val authorId: String,
    val revealAt: String,
    val locked: Boolean,
    val title: String?,
    val body: String?,
)
