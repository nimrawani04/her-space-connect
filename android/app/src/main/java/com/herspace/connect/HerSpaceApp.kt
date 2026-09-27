package com.herspace.connect

import android.app.Application
import com.herspace.connect.core.data.DemoSession
import com.herspace.connect.core.data.SupabaseProvider
import com.herspace.connect.ui.theme.Appearance

class HerSpaceApp : Application() {
    override fun onCreate() {
        super.onCreate()
        SupabaseProvider.init(this)
        Appearance.load(this)
        DemoSession.load(this)
    }
}
