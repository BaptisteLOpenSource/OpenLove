package app.openlove.push

import android.Manifest
import android.content.Context
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import app.openlove.R

// Once, on the first Accueil after Appairage; POST_NOTIFICATIONS is a runtime permission from API 33.
@Composable
fun AskNotifications(atHome: Boolean) {
    val context = LocalContext.current
    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) {}
    val prefs = remember { context.getSharedPreferences("push", Context.MODE_PRIVATE) }
    var asking by remember { mutableStateOf(false) }
    LaunchedEffect(atHome) {
        if (!atHome || Build.VERSION.SDK_INT < 33 || prefs.getBoolean("asked", false)) return@LaunchedEffect
        prefs.edit().putBoolean("asked", true).apply()
        asking = true
    }
    if (asking) {
        AlertDialog(
            onDismissRequest = { asking = false },
            title = { Text(stringResource(R.string.push_permission_title)) },
            text = { Text(stringResource(R.string.push_permission_text)) },
            confirmButton = {
                TextButton(
                    onClick = {
                        asking = false
                        launcher.launch(Manifest.permission.POST_NOTIFICATIONS)
                    },
                ) { Text(stringResource(R.string.push_permission_allow)) }
            },
            dismissButton = {
                TextButton(onClick = { asking = false }) { Text(stringResource(R.string.push_permission_later)) }
            },
        )
    }
}
