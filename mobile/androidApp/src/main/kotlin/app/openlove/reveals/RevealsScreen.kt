package app.openlove.reveals

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TimePicker
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.material3.rememberTimePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import app.openlove.R
import app.openlove.core.api.Reveal
import app.openlove.core.api.RevealKind
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.LocalTime
import java.time.ZoneId
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle
import java.util.Locale

private val WHEN_FORMAT = DateTimeFormatter.ofLocalizedDateTime(FormatStyle.MEDIUM).withLocale(Locale.FRENCH)

private fun whenText(iso: String) = Instant.parse(iso).atZone(ZoneId.systemDefault()).format(WHEN_FORMAT)

@Composable
fun RevealsScreen(
    model: RevealsModel,
    onBack: () -> Unit,
) {
    val state by model.state.collectAsState()
    val scope = rememberCoroutineScope()
    var writing by remember { mutableStateOf(false) }
    LaunchedEffect(model) { model.refresh() }
    BackHandler { if (writing) writing = false else onBack() }

    if (writing) {
        RevealForm(
            onSubmit = { kind, title, body, at -> model.create(kind, title, body, at) },
            onDone = { writing = false },
        )
        return
    }
    Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(stringResource(R.string.reveals_title), style = MaterialTheme.typography.titleLarge)
        if (state.failed) Text(stringResource(R.string.reveals_failed), color = MaterialTheme.colorScheme.error)
        Button(onClick = { writing = true }) { Text(stringResource(R.string.reveals_write)) }
        if (state.items.isEmpty() && !state.failed) Text(stringResource(R.string.reveals_empty))
        LazyColumn(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(state.items, key = { it.id }) { RevealCard(it, mine = it.authorId == state.me) }
        }
        TextButton(onClick = { scope.launch { model.refresh() } }) { Text(stringResource(R.string.retry)) }
    }
}

@Composable
private fun RevealCard(
    r: Reveal,
    mine: Boolean,
) {
    val kind = stringResource(if (r.kind == RevealKind.Letter) R.string.reveals_kind_letter else R.string.reveals_kind_surprise)
    val date = whenText(r.revealAt)
    Card {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            if (r.title == null || r.body == null) {
                Text(stringResource(R.string.reveals_locked, kind), style = MaterialTheme.typography.titleMedium)
                Text(stringResource(R.string.reveals_opens_on, date))
            } else {
                Text(r.title, style = MaterialTheme.typography.titleMedium)
                Text(r.body)
                Text(
                    stringResource(if (r.locked && mine) R.string.reveals_scheduled else R.string.reveals_revealed_on, date),
                    style = MaterialTheme.typography.bodySmall,
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun RevealForm(
    onSubmit: suspend (RevealKind, String, String, String) -> CreateResult,
    onDone: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    var kind by remember { mutableStateOf(RevealKind.Letter) }
    var title by remember { mutableStateOf("") }
    var body by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<CreateResult?>(null) }
    var pickDate by remember { mutableStateOf(false) }
    val date = rememberDatePickerState(initialSelectedDateMillis = System.currentTimeMillis())
    val time = rememberTimePickerState(is24Hour = true)

    // DatePicker millis are UTC midnight of the picked day
    fun revealAt(): String? {
        val day = date.selectedDateMillis?.let { Instant.ofEpochMilli(it).atZone(ZoneOffset.UTC).toLocalDate() } ?: return null
        return day
            .atTime(LocalTime.of(time.hour, time.minute))
            .atZone(ZoneId.systemDefault())
            .toInstant()
            .toString()
    }

    Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            FilterChip(kind == RevealKind.Letter, { kind = RevealKind.Letter }, { Text(stringResource(R.string.reveals_kind_letter)) })
            FilterChip(kind == RevealKind.Surprise, { kind = RevealKind.Surprise }, { Text(stringResource(R.string.reveals_kind_surprise)) })
        }
        OutlinedTextField(title, { title = it }, label = { Text(stringResource(R.string.reveals_field_title)) })
        OutlinedTextField(body, { body = it }, label = { Text(stringResource(R.string.reveals_field_body)) }, minLines = 3)
        TextButton(onClick = { pickDate = true }) {
            Text(revealAt()?.let { whenText(it) } ?: stringResource(R.string.reveals_pick_date))
        }
        TimePicker(time)
        error?.let {
            Text(
                stringResource(if (it == CreateResult.Invalid) R.string.reveals_error_invalid else R.string.reveals_failed),
                color = MaterialTheme.colorScheme.error,
            )
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            TextButton(onClick = onDone) { Text(stringResource(R.string.reveals_cancel)) }
            Button(
                enabled = title.isNotBlank() && body.isNotBlank(),
                onClick = {
                    val at = revealAt() ?: return@Button
                    scope.launch {
                        val result = onSubmit(kind, title, body, at)
                        if (result == CreateResult.Ok) onDone() else error = result
                    }
                },
            ) { Text(stringResource(R.string.reveals_submit)) }
        }
    }
    if (pickDate) {
        DatePickerDialog(
            onDismissRequest = { pickDate = false },
            confirmButton = { TextButton(onClick = { pickDate = false }) { Text(stringResource(R.string.mood_close)) } },
        ) { DatePicker(date) }
    }
}
