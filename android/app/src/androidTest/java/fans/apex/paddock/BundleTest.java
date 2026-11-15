package fans.apex.paddock;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.rule.ActivityTestRule;
import org.junit.*;
import org.junit.runner.RunWith;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicReference;
import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class BundleTest {
    @Rule public ActivityTestRule<MainActivity> activity = new ActivityTestRule<>(MainActivity.class);
    private String js(String code) throws Exception {
        CountDownLatch latch=new CountDownLatch(1);AtomicReference<String> result=new AtomicReference<>();
        activity.getActivity().runOnUiThread(()->activity.getActivity().web.evaluateJavascript(code,value->{result.set(value);latch.countDown();}));
        assertTrue("WebView script timed out",latch.await(10,TimeUnit.SECONDS));return result.get();
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
        js("document.querySelector('[data-go=timing]').click();document.querySelector('[data-timing-mode=duel]')?.click();");
        assertEquals("true",js("document.body.textContent.includes('Driver Duel')"));
    }
    @Test public void proxyAllowlist() throws Exception {
        assertTrue(MainActivity.allowed(new java.net.URL("https://api.jolpi.ca/ergast/f1/current.json")));
        assertFalse(MainActivity.allowed(new java.net.URL("http://api.jolpi.ca/ergast/f1/current.json")));
        assertFalse(MainActivity.allowed(new java.net.URL("https://evil.example/ergast/f1/current.json")));
        assertFalse(MainActivity.allowed(new java.net.URL("https://api.jolpi.ca@evil.example/ergast/f1/current.json")));
        assertFalse(MainActivity.allowed(new java.net.URL("https://api.jolpi.ca/private")));
    }
}
