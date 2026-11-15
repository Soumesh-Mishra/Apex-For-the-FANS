package fans.apex.paddock;

import android.app.Activity;
import android.os.Bundle;
import android.content.Intent;
import android.net.Uri;
import android.graphics.Color;
import android.view.View;
import android.webkit.*;
import androidx.webkit.WebViewAssetLoader;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

public class MainActivity extends Activity {
    static final String HOST = "appassets.androidplatform.net";
    WebView web;
    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(16,16,18));
        getWindow().setNavigationBarColor(Color.rgb(16,16,18));
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(16,16,18));
        web.setFitsSystemWindows(true);
        setContentView(web);
        // Keep content out of display cutouts/system bars on edge-to-edge Android.
        web.setOnApplyWindowInsetsListener((view,insets)->{
            view.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());
            return insets;
        });
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportMultipleWindows(false);
        WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
            .addPathHandler("/",new WebViewAssetLoader.AssetsPathHandler(this)).build();
        web.setWebViewClient(new WebViewClient(){
            @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){
                Uri uri=request.getUrl();
                if(HOST.equals(uri.getHost()) && "/native-proxy".equals(uri.getPath())) {
                    if(!"GET".equals(request.getMethod()))return text(405,"Method not allowed");
                    return upstream(uri.getQueryParameter("url"));
                }
                if(HOST.equals(uri.getHost())){
                    String route=uri.getPath();
                    if("/".equals(route))uri=uri.buildUpon().path("/index.html").build();
                    else if(Arrays.asList("/login","/privacy","/credits","/install").contains(route))uri=uri.buildUpon().path(route+".html").build();
                }
                return loader.shouldInterceptRequest(uri);
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){
                Uri uri=request.getUrl();
                if("https".equals(uri.getScheme())&&HOST.equals(uri.getHost()))return false;
                if(request.isForMainFrame()&&("https".equals(uri.getScheme())||"http".equals(uri.getScheme()))){
                    try{startActivity(new Intent(Intent.ACTION_VIEW,uri));}catch(Exception ignored){}
                }
                return true;
            }
        });
        web.loadUrl("https://"+HOST+"/index.html?source=android#overview");
    }
    static boolean allowed(URL url){
        if(!"https".equals(url.getProtocol())||url.getUserInfo()!=null||(url.getPort()!=-1&&url.getPort()!=443))return false;
        String host=url.getHost(),path=url.getPath();
        return (host.equals("api.jolpi.ca")&&path.startsWith("/ergast/f1/")) ||
               (host.equals("api.openf1.org")&&path.startsWith("/v1/")) ||
               (host.equals("www.autosport.com")&&path.equals("/rss/feed/f1"));
    }
    static WebResourceResponse text(int status,String message){
        return new WebResourceResponse("text/plain","UTF-8",status,status==200?"OK":"Request failed",Collections.singletonMap("Cache-Control","no-store"),new ByteArrayInputStream(message.getBytes(StandardCharsets.UTF_8)));
    }
    static WebResourceResponse upstream(String input){
        try{
            if(input==null||input.length()>2048)return text(400,"Invalid data URL");
            URL url=new URL(input);
            for(int redirect=0;redirect<4;redirect++){
                if(!allowed(url))return text(403,"Data source is not allowed");
                HttpURLConnection connection=(HttpURLConnection)url.openConnection();
                try{
                    connection.setConnectTimeout(8000);connection.setReadTimeout(12000);
                    connection.setInstanceFollowRedirects(false);
                    connection.setRequestProperty("User-Agent","APEX F1 Android/1.0");
                    int status=connection.getResponseCode();
                    if(status>=300&&status<400){String location=connection.getHeaderField("Location");if(location==null)return text(502,"Invalid redirect");url=new URL(url,location);continue;}
                    if(status<200||status>=300)return text(status,"Racing feed unavailable");
                    ByteArrayOutputStream out=new ByteArrayOutputStream();
                    try(InputStream body=connection.getInputStream()){
                        byte[] buffer=new byte[8192];int count;
                        while((count=body.read(buffer))!=-1){if(out.size()+count>4*1024*1024)return text(502,"Feed response too large");out.write(buffer,0,count);}
                    }
                    String mime=url.getHost().equals("www.autosport.com")?"application/xml":"application/json";
                    return new WebResourceResponse(mime,"UTF-8",200,"OK",Collections.singletonMap("Cache-Control","no-store"),new ByteArrayInputStream(out.toByteArray()));
                }finally{connection.disconnect();}
            }
        }catch(Exception ignored){}
        return text(502,"Feed unavailable. Check your internet connection.");
    }
    @Override public void onBackPressed(){if(web.canGoBack())web.goBack();else super.onBackPressed();}
    @Override protected void onDestroy(){web.destroy();super.onDestroy();}
}
