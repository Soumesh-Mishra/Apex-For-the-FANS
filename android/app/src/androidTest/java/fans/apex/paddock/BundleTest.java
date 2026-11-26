package fans.apex.paddock;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.rule.ActivityTestRule;
import org.junit.*;
import org.junit.runner.RunWith;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicReference;
import static org.junit.Assert.*;
import android.content.pm.ActivityInfo;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

@RunWith(AndroidJUnit4.class)
public class BundleTest {
    @Rule public ActivityTestRule<MainActivity> activity = new ActivityTestRule<>(MainActivity.class);
    private String js(String code) throws Exception {
        CountDownLatch latch=new CountDownLatch(1);AtomicReference<String> result=new AtomicReference<>();
        activity.getActivity().runOnUiThread(()->activity.getActivity().web.evaluateJavascript(code,value->{result.set(value);latch.countDown();}));
        assertTrue("WebView script timed out",latch.await(10,TimeUnit.SECONDS));return result.get();
    }
    private void ready() throws Exception {
        long deadline=System.currentTimeMillis()+45000;
        while(System.currentTimeMillis()<deadline){
            if("true".equals(js("!!document.querySelector('#team') && typeof selectTeamTheme === 'function'")))return;
            Thread.sleep(250);
        }
        fail("Dashboard did not become ready");
    }
    private void ui(Runnable action) throws Exception {
        androidx.test.platform.app.InstrumentationRegistry.getInstrumentation().runOnMainSync(action);
        androidx.test.platform.app.InstrumentationRegistry.getInstrumentation().waitForIdleSync();
    }
    private void assertActions() throws Exception {
        // Every action's centre must be visible, hit-testable and inside its header.
        assertEquals("true",js("(()=>{const h=document.querySelector('header').getBoundingClientRect();return ['team-picker-link','spoiler-toggle','refresh','account-link'].every(id=>{const e=document.getElementById(id),r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return r.width>=29&&r.height>=29&&r.left>=0&&r.right<=innerWidth+1&&r.top>=h.top&&r.bottom<=h.bottom+1&&!!hit&&e.contains(hit);});})()"));
    }
    @Test public void headerFitsWithTeamLogoInBothOrientations() throws Exception {
        ready();
        js("selectTeamTheme('red-bull-racing',true)");
        MainActivity a=activity.getActivity();
        for(int orientation:new int[]{ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE,ActivityInfo.SCREEN_ORIENTATION_PORTRAIT}){
            ui(()->a.setRequestedOrientation(orientation));
            boolean landscape=orientation==ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE;
            for(int i=0;i<60;i++){if(Boolean.toString(landscape).equals(js("innerWidth>innerHeight")))break;Thread.sleep(100);}
            assertEquals(Boolean.toString(landscape),js("innerWidth>innerHeight"));
            assertActions();
            ui(()->{
                WindowInsetsCompat window=ViewCompat.getRootWindowInsets(a.content);
                assertNotNull(window);
                Insets safe=window.getInsets(WindowInsetsCompat.Type.systemBars()|WindowInsetsCompat.Type.displayCutout());
                int[] location=new int[2];a.web.getLocationInWindow(location);
                assertTrue("WebView must start below status bar/cutout",location[1]>=safe.top);
                assertTrue("WebView must start beyond landscape cutout",location[0]>=safe.left);
                assertEquals("Do not pad the WebView itself",0,a.web.getPaddingTop());
            });
        }
    }
    @Test public void cutoutInsetsResizeContainerWithoutAccumulating() throws Exception {
        ready();MainActivity a=activity.getActivity();
        int types=WindowInsetsCompat.Type.systemBars()|WindowInsetsCompat.Type.displayCutout();
        ui(()->{
            WindowInsetsCompat initial=ViewCompat.getRootWindowInsets(a.content);
            assertNotNull(initial);
            WindowInsetsCompat cutout=new WindowInsetsCompat.Builder(initial).setInsets(types,Insets.of(60,100,50,70)).build();
            for(int i=0;i<2;i++){
                WindowInsetsCompat forwarded=ViewCompat.dispatchApplyWindowInsets(a.content,cutout);
                assertEquals(100,a.content.getPaddingTop());assertEquals(60,a.content.getPaddingLeft());
                assertEquals(50,a.content.getPaddingRight());assertEquals(70,a.content.getPaddingBottom());
                assertEquals(Insets.NONE,forwarded.getInsets(types));
            }
            WindowInsetsCompat cleared=new WindowInsetsCompat.Builder(initial).setInsets(types,Insets.NONE).build();
            ViewCompat.dispatchApplyWindowInsets(a.content,cleared);
            assertEquals(0,a.content.getPaddingTop());assertEquals(0,a.content.getPaddingLeft());
            ViewCompat.dispatchApplyWindowInsets(a.content,initial);
        });
        assertActions();
    }
    @Test public void bundledDashboardAndOfflineHistory() throws Exception {
        long deadline=System.currentTimeMillis()+45000;
        while(System.currentTimeMillis()<deadline){if("true".equals(js("!!document.querySelector('#driver-duel-panel')")))break;Thread.sleep(250);}
        assertEquals("true",js("!!document.querySelector('#driver-duel-panel')"));
        assertEquals("true",js("!!document.querySelector('#calendar-view')"));
        js("window.__bundleTest='pending';Promise.all([fetch('/api/auth/config').then(r=>r.json()),fetch('/api/history/bahrain-2024').then(r=>r.json())]).then(([auth,history])=>{window.__bundleTest=auth.enabled===false&&!!history?'passed':'failed';}).catch(e=>{window.__bundleTest=String(e);});");
        for(int i=0;i<40;i++){if("\"passed\"".equals(js("window.__bundleTest")))break;Thread.sleep(250);}
        assertEquals("\"passed\"",js("window.__bundleTest"));
        // Built-in sample comparison is present without a host or Google account.
        js("document.querySelector('[data-view=timing]').click();document.querySelector('[data-timing-mode=library]').click();document.querySelector('[data-archive-mode=duel]').click();");
        assertEquals("true",js("location.hash==='#timing/archive/duel' && !document.querySelector('#driver-duel-panel').classList.contains('hidden')"));
    }
    @Test public void personalPaddockSurvivesReloadWithoutAccount() throws Exception {
        ready();
        for(int i=0;i<60;i++){if("true".equals(js("!!window.PersonalPaddock")))break;Thread.sleep(100);}
        assertEquals("true",js("!!window.PersonalPaddock"));
        js("PersonalPaddock.setTeam('ferrari');if(!PersonalPaddock.profile().favouriteDrivers.includes('leclerc'))PersonalPaddock.toggleDriver('leclerc');if(!PersonalPaddock.hasRace('2024-8'))PersonalPaddock.toggleRace({season:2024,round:8,raceName:'Monaco Grand Prix',date:'2024-05-26',Circuit:{circuitName:'Circuit de Monaco'}});");
        assertEquals("true",js("PersonalPaddock.profile().team==='ferrari'&&PersonalPaddock.profile().favouriteDrivers.includes('leclerc')&&PersonalPaddock.hasRace('2024-8')"));
        js("window.__paddockMode='pending';fetch('/api/paddock').then(r=>r.json()).then(d=>window.__paddockMode=d.mode).catch(()=>window.__paddockMode='error');");
        for(int i=0;i<40;i++){if("\"device\"".equals(js("window.__paddockMode")))break;Thread.sleep(100);}
        assertEquals("\"device\"",js("window.__paddockMode"));
        // reload() can return while the old document is still executing scripts.
        // Wait for a new document and its controls before testing persisted state.
        js("window.__paddockReloadMarker=true");
        ui(()->activity.getActivity().web.reload());
        String reloaded="window.__paddockReloadMarker===undefined&&!!window.PersonalPaddock&&!!document.querySelector('[data-view=paddock]')";
        for(int i=0;i<150;i++){if("true".equals(js(reloaded)))break;Thread.sleep(100);}
        assertEquals("Reloaded paddock did not become ready", "true",js(reloaded));
        assertEquals("Preferences must survive a new document", "true",js("PersonalPaddock.profile().team==='ferrari'&&PersonalPaddock.profile().favouriteDrivers.includes('leclerc')&&PersonalPaddock.hasRace('2024-8')"));
        assertEquals("true",js("!!document.querySelector('[data-view=paddock]')"));
    }
    @Test public void strategyLabRunsWithoutBackend() throws Exception {
        ready();
        for(int i=0;i<60;i++){if("true".equals(js("typeof StrategyCore!=='undefined'&&!!document.getElementById('strategy-optimise')")))break;Thread.sleep(100);}
        assertEquals("true",js("typeof StrategyCore!=='undefined'&&!!document.getElementById('strategy-optimise')"));
        js("document.querySelector('[data-go=strategy]').click();document.getElementById('strategy-B-count').value='1';document.getElementById('strategy-B-count').dispatchEvent(new Event('change',{bubbles:true}));document.getElementById('strategy-optimise').click();");
        assertEquals("true",js("!document.getElementById('strategy-output').hidden&&document.getElementById('strategy-status').textContent.includes('Best B pit laps')&&!!document.querySelector('#strategy-chart svg')"));
        js("document.getElementById('strategy-sc').checked=true;document.getElementById('strategy-sc').dispatchEvent(new Event('change',{bubbles:true}));");
        assertEquals("true",js("!document.getElementById('strategy-output').hidden&&!document.getElementById('strategy-sc-fields').hidden"));
        assertEquals("true",js("document.getElementById('strategy-export').disabled"));
    }
    @Test public void proxyAllowlist() throws Exception {
        assertTrue(MainActivity.allowed(new java.net.URL("https://api.jolpi.ca/ergast/f1/current.json")));
        assertFalse(MainActivity.allowed(new java.net.URL("http://api.jolpi.ca/ergast/f1/current.json")));
        assertFalse(MainActivity.allowed(new java.net.URL("https://evil.example/ergast/f1/current.json")));
        assertFalse(MainActivity.allowed(new java.net.URL("https://api.jolpi.ca@evil.example/ergast/f1/current.json")));
        assertFalse(MainActivity.allowed(new java.net.URL("https://api.jolpi.ca/private")));
    }
}
