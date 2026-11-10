package pe.facturo.app;

import android.os.Bundle;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Botón Atrás: vuelve en el historial de la web y, en la primera pantalla, sale de la app.
        getOnBackPressedDispatcher().addCallback(
            this,
            new OnBackPressedCallback(true) {
                @Override
                public void handleOnBackPressed() {
                    WebView webView = getBridge().getWebView();
                    if (webView.canGoBack()) {
                        webView.goBack();
                        return;
                    }
                    // Raíz del historial: se desactiva este callback y se usa el comportamiento por defecto (cerrar).
                    setEnabled(false);
                    getOnBackPressedDispatcher().onBackPressed();
                }
            }
        );
    }
}
