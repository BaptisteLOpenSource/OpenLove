package app.openlove

import android.app.Application
import app.openlove.push.createChatChannel

class OpenLoveApp : Application() {
    // One per process: DataStore refuses two stores on session.enc.
    val container by lazy { AppContainer(this) }

    override fun onCreate() {
        super.onCreate()
        createChatChannel(this)
    }
}
