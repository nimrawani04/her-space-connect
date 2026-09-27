import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.plugin.serialization")
    id("org.jetbrains.kotlin.plugin.compose")
}

// Same Supabase project as the web app (see .env / src/integrations/supabase/config.ts).
val supabaseUrl = "https://syvqiqhyaoohbjbkftaj.supabase.co"
val supabaseAnonKey =
    "sb_publishable_B8OjiP_STSjviMyhtF_5RQ_D5mRy53U"
// Web OAuth client ID of the Supabase project's Google provider (Supabase dashboard
// → Authentication → Providers → Google → Client ID, the *.apps.googleusercontent.com
// value). Used for NATIVE Google sign-in. Project-local, never committed — put it in
// android/local.properties (same file as your sdk.dir):
//   GOOGLE_WEB_CLIENT_ID=xxxx.apps.googleusercontent.com
// (A global ~/.gradle/gradle.properties entry works too, but per-app local is cleaner
// when you have several apps using OAuth.)
// Empty = native sign-in disabled, "Continue with Google" falls back to the browser.
val googleWebClientId: String = Properties().apply {
    rootProject.file("local.properties").takeIf { it.exists() }?.inputStream()?.use(::load)
}.getProperty("GOOGLE_WEB_CLIENT_ID")?.trim()
    ?: providers.gradleProperty("GOOGLE_WEB_CLIENT_ID").getOrElse("").trim()

android {
    namespace = "com.herspace.connect"
    compileSdk = 37
    buildToolsVersion = "36.0.0"

    defaultConfig {
        applicationId = "com.herspace.connect"
        minSdk = 26
        targetSdk = 37
        versionCode = 1
        versionName = "1.0.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        debug {
            buildConfigField("String", "SUPABASE_URL", "\"$supabaseUrl\"")
            buildConfigField("String", "SUPABASE_ANON_KEY", "\"$supabaseAnonKey\"")
            buildConfigField("String", "GOOGLE_WEB_CLIENT_ID", "\"$googleWebClientId\"")
        }
        release {
            isMinifyEnabled = false
            buildConfigField("String", "SUPABASE_URL", "\"$supabaseUrl\"")
            buildConfigField("String", "SUPABASE_ANON_KEY", "\"$supabaseAnonKey\"")
            buildConfigField("String", "GOOGLE_WEB_CLIENT_ID", "\"$googleWebClientId\"")
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    // jvmTarget defaults to compileOptions.targetCompatibility with AGP 9
    // built-in Kotlin, so no kotlinOptions block is needed.
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2026.09.00")
    implementation(composeBom)

    implementation("androidx.core:core-ktx:1.19.1")
    implementation("androidx.activity:activity-compose:1.13.0")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.11.0")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.11.0")
    implementation("androidx.navigation:navigation-compose:2.10.2")

    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.compose.ui:ui-tooling-preview")
    debugImplementation("androidx.compose.ui:ui-tooling")

    // Supabase Kotlin — same backend as the web app.
    implementation(platform("io.github.jan-tennert.supabase:bom:3.8.0"))
    implementation("io.github.jan-tennert.supabase:auth-kt")
    implementation("io.github.jan-tennert.supabase:postgrest-kt")
    implementation("io.github.jan-tennert.supabase:realtime-kt")
    implementation("io.github.jan-tennert.supabase:storage-kt")
    implementation("io.github.jan-tennert.supabase:functions-kt")

    // Ktor HTTP engine — supabase-kt needs an engine implementation on the classpath.
    // Version must match the Ktor version pulled in by the Supabase BOM.
    implementation("io.ktor:ktor-client-android:3.5.1")

    // Native Google sign-in (Credential Manager). Documented working set.
    implementation("androidx.credentials:credentials:1.3.0")
    implementation("androidx.credentials:credentials-play-services-auth:1.3.0")
    implementation("com.google.android.libraries.identity.googleid:googleid:1.1.0")

    // Full-screen background video on the login screen — same clip as web auth.
    implementation("androidx.media3:media3-exoplayer:1.8.0")
    implementation("androidx.media3:media3-ui:1.8.0")

    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.11.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.11.0")

    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.3.0")
}
