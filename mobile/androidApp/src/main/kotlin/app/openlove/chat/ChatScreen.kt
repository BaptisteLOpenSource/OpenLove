package app.openlove.chat

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.repeatOnLifecycle
import app.openlove.R
import app.openlove.home.MoodPicker
import kotlinx.coroutines.launch

@Composable
fun ChatScreen(
    chat: ChatModel,
    mood: String?,
    onBack: () -> Unit,
    onSetMood: (String) -> Unit,
) {
    val state by chat.state.collectAsState()
    val seen = seenId(state.items, state.me, state.partnerReadId)
    val scope = rememberCoroutineScope()
    val lifecycle = LocalLifecycleOwner.current.lifecycle
    LaunchedEffect(chat) { lifecycle.repeatOnLifecycle(Lifecycle.State.STARTED) { chat.poll() } }
    val list = rememberLazyListState()
    LaunchedEffect(state.items.lastOrNull()?.id) {
        if (state.items.isNotEmpty()) list.scrollToItem(state.items.lastIndex)
    }
    BackHandler(onBack = onBack)

    var draft by remember { mutableStateOf("") }
    Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(stringResource(R.string.chat_title), Modifier.weight(1f), style = MaterialTheme.typography.titleLarge)
            MoodPicker(mood, onSetMood)
        }
        if (state.failed) Text(stringResource(R.string.chat_failed), color = MaterialTheme.colorScheme.error)
        LazyColumn(Modifier.weight(1f), state = list, verticalArrangement = Arrangement.spacedBy(4.dp)) {
            if (state.hasOlder) {
                item { TextButton(onClick = { scope.launch { chat.loadOlder() } }) { Text(stringResource(R.string.chat_load_older)) } }
            }
            items(state.items, key = { it.id }) { m ->
                Column {
                    Text(m.body)
                    if (m.id == seen) Text(stringResource(R.string.chat_seen), style = MaterialTheme.typography.bodySmall)
                }
            }
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedTextField(draft, { draft = it }, Modifier.weight(1f), placeholder = { Text(stringResource(R.string.chat_hint)) })
            Button(
                enabled = draft.isNotBlank(),
                onClick = {
                    val text = draft
                    draft = ""
                    scope.launch { chat.send(text) }
                },
            ) { Text(stringResource(R.string.chat_send)) }
        }
    }
}
