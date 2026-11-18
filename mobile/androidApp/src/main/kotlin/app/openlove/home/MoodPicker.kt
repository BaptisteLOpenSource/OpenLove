package app.openlove.home

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import app.openlove.R
import app.openlove.core.api.MOODS

// One picker, two entry points: Accueil and chat header.
@Composable
fun MoodPicker(
    mine: String?,
    onSetMood: (String) -> Unit,
) {
    var open by remember { mutableStateOf(false) }
    OutlinedButton(onClick = { open = true }) { Text(stringResource(R.string.mood_open)) }
    if (!open) return
    AlertDialog(
        onDismissRequest = { open = false },
        title = { Text(stringResource(R.string.mood_title)) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                MOODS.forEach { mood ->
                    val label = moodLabel(mood)
                    TextButton(onClick = {
                        open = false
                        onSetMood(mood)
                    }) { Text(if (mood == mine) stringResource(R.string.mood_selected, label) else label) }
                }
            }
        },
        confirmButton = { TextButton(onClick = { open = false }) { Text(stringResource(R.string.mood_close)) } },
    )
}

@Composable
fun moodLabel(mood: String?): String =
    when (mood) {
        "happy" -> stringResource(R.string.mood_happy)
        "calm" -> stringResource(R.string.mood_calm)
        "tired" -> stringResource(R.string.mood_tired)
        "sad" -> stringResource(R.string.mood_sad)
        "anxious" -> stringResource(R.string.mood_anxious)
        else -> stringResource(R.string.mood_none)
    }
