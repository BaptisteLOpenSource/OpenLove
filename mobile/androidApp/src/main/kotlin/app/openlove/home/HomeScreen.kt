package app.openlove.home

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import app.openlove.R
import app.openlove.core.api.HomeResponse
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale

@Composable
fun HomeScreen(
    home: HomeResponse,
    onOpenChat: () -> Unit,
    onOpenReveals: () -> Unit,
    onSetMood: (String) -> Unit,
) {
    Column(Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Button(onClick = onOpenChat) { Text(stringResource(R.string.home_open_chat)) }
        Button(onClick = onOpenReveals) { Text(stringResource(R.string.home_open_reveals)) }
        Text(stringResource(R.string.mood_title), style = MaterialTheme.typography.titleMedium)
        Text(stringResource(R.string.mood_mine, moodLabel(home.mood.mine)))
        Text(stringResource(R.string.mood_partner, moodLabel(home.mood.partner)))
        MoodPicker(home.mood.mine, onSetMood)
        Text(stringResource(R.string.mood_history_title), style = MaterialTheme.typography.titleSmall)
        home.moodHistory.forEach { d ->
            val day = LocalDate.parse(d.day).format(DAY_FORMAT)
            val none = stringResource(R.string.mood_history_none)
            Text(
                stringResource(
                    R.string.mood_history_line,
                    day,
                    d.mine?.let { moodLabel(it) } ?: none,
                    d.partner?.let { moodLabel(it) } ?: none,
                ),
            )
        }
        Text(stringResource(R.string.home_milestone_title), style = MaterialTheme.typography.titleMedium)
        val total = home.milestone.totalDays
        Text(pluralStringResource(R.plurals.home_total_days, total, total), style = MaterialTheme.typography.displaySmall)
        Text(stringResource(R.string.home_upcoming_title), style = MaterialTheme.typography.titleMedium)
        val upcoming = home.upcomingDate
        if (upcoming == null) {
            Text(stringResource(R.string.home_upcoming_none))
        } else {
            Text(upcoming.label, style = MaterialTheme.typography.titleLarge)
            val days = upcoming.inDays
            Text(
                if (days == 0) {
                    stringResource(R.string.home_upcoming_today)
                } else {
                    pluralStringResource(R.plurals.home_upcoming_in_days, days, days)
                },
            )
        }
    }
}

private val DAY_FORMAT = DateTimeFormatter.ofPattern("EEE d MMM", Locale.FRENCH)
