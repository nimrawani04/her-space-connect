package com.herspace.connect.ui.navigation

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.herspace.connect.core.data.DemoSession
import com.herspace.connect.data.repository.AuthRepository
import com.herspace.connect.ui.screens.*
import com.herspace.connect.ui.theme.Appearance
import com.herspace.connect.ui.theme.BackgroundStyle
import com.herspace.connect.ui.theme.HerSpaceColors
import com.herspace.connect.viewmodel.AuthViewModel
import kotlinx.coroutines.launch

/** The web nav array from `src/routes/_authenticated/route.tsx`. */
private data class NavItem(val route: String, val label: String, val icon: ImageVector)

private val navItems = listOf(
    NavItem(Routes.DASHBOARD, "Dashboard", Icons.Filled.Dashboard),
    NavItem(Routes.HEALTH, "Health Hub", Icons.Filled.Favorite),
    NavItem(Routes.PREGNANCY, "Pregnancy", Icons.Filled.ChildCare),
    NavItem(Routes.COMMUNITY, "Safe Space", Icons.Filled.Forum),
    NavItem(Routes.EXPERIENCE, "Experience Match", Icons.Filled.AutoAwesome),
    NavItem(Routes.MENTORSHIP, "Mentorship", Icons.Filled.School),
    NavItem(Routes.CAREERS, "Careers", Icons.Filled.Work),
    NavItem(Routes.MARKETPLACE, "Marketplace", Icons.Filled.Store),
    NavItem(Routes.SAFETY, "Safety Network", Icons.Filled.Security),
    NavItem(Routes.TRAVEL, "Travel Sisterhood", Icons.Filled.Flight),
    NavItem(Routes.WELLNESS, "Mental Wellness", Icons.Filled.Spa),
    NavItem(Routes.LIBRARY, "Library", Icons.Filled.MenuBook)
)

/**
 * Authenticated shell — the Android twin of `AuthedShell` in
 * `src/routes/_authenticated/route.tsx`: collapsible sidebar (drawer),
 * sticky header with Appearance / welcome / avatar, and the screen content.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HerSpaceNav(authVm: AuthViewModel = viewModel()) {
    val nav = rememberNavController()
    val signedIn by authVm.signedIn.collectAsState()
    val sessionKnown by authVm.sessionKnown.collectAsState()
    val drawerState = rememberDrawerState(DrawerValue.Closed)
    val scope = rememberCoroutineScope()
    val backStack by nav.currentBackStackEntryAsState()
    val route = backStack?.destination?.route

    var name by remember { mutableStateOf("Sister") }
    LaunchedEffect(signedIn) {
        if (!signedIn) return@LaunchedEffect
        name = if (DemoSession.isActive) DemoSession.name
        else runCatching { AuthRepository().me()?.displayName }.getOrNull()?.takeIf { it.isNotBlank() } ?: "Sister"
    }

    if (!sessionKnown) {
        SplashScreen()
        return
    }

    if (!signedIn) {
        val unauth = rememberNavController()
        NavHost(unauth, startDestination = Routes.AUTH) {
            composable(Routes.AUTH) {
                AuthScreen(
                    onDone = {},
                    onPrivacy = { unauth.navigate(Routes.PRIVACY) },
                    onTerms = { unauth.navigate(Routes.TERMS) }
                )
            }
            composable(Routes.PRIVACY) { PrivacyScreen(onBack = { unauth.popBackStack() }) }
            composable(Routes.TERMS) { TermsScreen(onBack = { unauth.popBackStack() }) }
        }
        return
    }

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            AppDrawer(
                currentRoute = route,
                name = name,
                onNavigate = { target ->
                    scope.launch { drawerState.close() }
                    nav.navigate(target) { launchSingleTop = true; popUpTo(Routes.DASHBOARD) { saveState = true }; restoreState = true }
                },
                onAppearance = {
                    scope.launch { drawerState.close() }
                    nav.navigate(Routes.SETTINGS) { launchSingleTop = true }
                },
                onSignOut = { authVm.signOut() }
            )
        }
    ) {
        val bgBrush = backgroundBrush()
        Scaffold(
            topBar = {
                AppHeader(
                    name = name,
                    onMenu = { scope.launch { drawerState.open() } },
                    onAppearance = { nav.navigate(Routes.SETTINGS) { launchSingleTop = true } }
                )
            }
        ) { pad ->
            Box(
                Modifier
                    .padding(pad)
                    .fillMaxSize()
                    .then(if (bgBrush != null) Modifier.background(bgBrush) else Modifier.background(MaterialTheme.colorScheme.background))
            ) {
                NavHost(nav, startDestination = Routes.DASHBOARD, Modifier.fillMaxSize()) {
                    composable(Routes.DASHBOARD) { DashboardScreen { nav.navigate(it) } }
                    composable(Routes.HEALTH) { HealthScreen() }
                    composable(Routes.PREGNANCY) { PregnancyScreen() }
                    composable(Routes.COMMUNITY) { CommunityScreen() }
                    composable(Routes.EXPERIENCE) { ExperienceScreen() }
                    composable(Routes.MENTORSHIP) { MentorshipScreen() }
                    composable(Routes.MARKETPLACE) { MarketplaceScreen() }
                    composable(Routes.CAREERS) { CareersScreen() }
                    composable(Routes.TRAVEL) { TravelScreen() }
                    composable(Routes.SAFETY) { SafetyScreen() }
                    composable(Routes.LIBRARY) { LibraryScreen() }
                    composable(Routes.WELLNESS) { WellnessScreen() }
                    composable(Routes.SETTINGS) { SettingsScreen { authVm.signOut() } }
                }
            }
        }
    }
}

/** Mirrors the background presets in `settings.appearance.tsx`. */
@Composable
private fun backgroundBrush(): Brush? {
    val style = Appearance.background
    if (style == BackgroundStyle.PLAIN) return null
    val bg = MaterialTheme.colorScheme.background
    val earth = HerSpaceColors.Earth
    val sage = HerSpaceColors.Sage
    val sand = HerSpaceColors.Sand
    return when (style) {
        BackgroundStyle.WARM -> Brush.radialGradient(
            colors = listOf(earth.copy(alpha = 0.30f), bg),
            radius = 1400f
        )
        BackgroundStyle.SAGE -> Brush.linearGradient(
            colors = listOf(sage.copy(alpha = 0.20f), bg, sand.copy(alpha = 0.35f))
        )
        BackgroundStyle.DUSK -> Brush.verticalGradient(
            colors = listOf(earth.copy(alpha = 0.18f), bg)
        )
        BackgroundStyle.GRADIENT -> Brush.linearGradient(
            colors = listOf(earth.copy(alpha = 0.25f), bg, sage.copy(alpha = 0.30f))
        )
        BackgroundStyle.GRAIN -> Brush.radialGradient(colors = listOf(bg, bg))
        BackgroundStyle.PLAIN -> null
    }
}

@Composable
private fun AppHeader(name: String, onMenu: () -> Unit, onAppearance: () -> Unit) {
    // statusBarsPadding: the app is edge-to-edge, so without this the clock /
    // battery icons draw over the hamburger + title on full-screen phones.
    val narrow = androidx.compose.ui.platform.LocalConfiguration.current.screenWidthDp < 400
    Surface(
        color = MaterialTheme.colorScheme.background.copy(alpha = 0.85f),
        modifier = Modifier.fillMaxWidth().statusBarsPadding()
    ) {
        Column {
            Row(
                Modifier
                    .fillMaxWidth()
                    .height(56.dp)
                    .padding(horizontal = 12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = onMenu) {
                    Icon(Icons.Filled.Menu, contentDescription = "Menu", tint = MaterialTheme.colorScheme.onBackground)
                }
                Spacer(Modifier.width(4.dp))
                Text(
                    "HerSpace",
                    style = MaterialTheme.typography.titleMedium,
                    fontStyle = FontStyle.Italic,
                    maxLines = 1,
                    modifier = Modifier.weight(1f)
                )
                TextButton(onClick = onAppearance) {
                    Icon(Icons.Filled.Palette, contentDescription = "Appearance", modifier = Modifier.size(16.dp))
                    if (!narrow) {
                        Spacer(Modifier.width(6.dp))
                        Text("Appearance", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                Spacer(Modifier.width(8.dp))
                if (!narrow) {
                    Text(
                        "Welcome, ",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                Text(name, fontSize = 12.sp, fontWeight = FontWeight.Medium, maxLines = 1)
                Spacer(Modifier.width(8.dp))
                Box(
                    Modifier
                        .size(32.dp)
                        .clip(CircleShape)
                        .background(HerSpaceColors.Sand),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        name.trim().split(" ").mapNotNull { it.firstOrNull() }.take(2).joinToString("")
                            .uppercase().ifBlank { "S" },
                        fontSize = 12.sp,
                        color = HerSpaceColors.Earth
                    )
                }
            }
            HorizontalDivider(color = MaterialTheme.colorScheme.outline)
        }
    }
}

/** Cold-start splash: shown while the stored session is being restored. */
@Composable
private fun SplashScreen() {
    Box(
        Modifier
            .fillMaxSize()
            .background(Color.Black),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text("HerSpace", color = Color.White, fontSize = 28.sp, fontStyle = FontStyle.Italic)
            Spacer(Modifier.height(16.dp))
            CircularProgressIndicator(color = HerSpaceColors.Accent, modifier = Modifier.size(28.dp))
        }
    }
}

@Composable
private fun AppDrawer(
    currentRoute: String?,
    name: String,
    onNavigate: (String) -> Unit,
    onAppearance: () -> Unit,
    onSignOut: () -> Unit
) {
    ModalDrawerSheet(
        drawerContainerColor = MaterialTheme.colorScheme.background,
        modifier = Modifier.widthIn(max = 300.dp)
    ) {
        Column(
            Modifier
                .fillMaxHeight()
                .verticalScroll(rememberScrollState())
                .padding(vertical = 20.dp)
        ) {
            Text(
                "HerSpace",
                fontSize = 24.sp,
                fontStyle = FontStyle.Italic,
                modifier = Modifier.padding(start = 20.dp, bottom = 20.dp)
            )
            Text(
                "YOUR SPACE",
                fontSize = 11.sp,
                letterSpacing = 2.2.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(start = 20.dp, bottom = 8.dp)
            )
            navItems.forEach { item ->
                val active = currentRoute == item.route
                NavigationDrawerItem(
                    label = { Text(item.label, fontSize = 13.sp) },
                    icon = { Icon(item.icon, contentDescription = null, modifier = Modifier.size(18.dp)) },
                    selected = active,
                    onClick = { onNavigate(item.route) },
                    colors = NavigationDrawerItemDefaults.colors(
                        selectedContainerColor = HerSpaceColors.Accent,
                        unselectedContainerColor = Color.Transparent,
                        selectedTextColor = Color.Black,
                        unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant,
                        selectedIconColor = Color.Black,
                        unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant
                    ),
                    badge = {},
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 2.dp)
                )
            }
            HorizontalDivider(Modifier.padding(horizontal = 20.dp, vertical = 12.dp))
            NavigationDrawerItem(
                label = { Text("Appearance", fontSize = 13.sp) },
                icon = { Icon(Icons.Filled.Palette, contentDescription = null, modifier = Modifier.size(18.dp)) },
                selected = false,
                onClick = onAppearance,
                modifier = Modifier.padding(horizontal = 12.dp, vertical = 2.dp)
            )
            NavigationDrawerItem(
                label = { Text("Sign out", fontSize = 13.sp) },
                icon = { Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = null, modifier = Modifier.size(18.dp)) },
                selected = false,
                onClick = onSignOut,
                modifier = Modifier.padding(horizontal = 12.dp, vertical = 2.dp)
            )
        }
    }
}
