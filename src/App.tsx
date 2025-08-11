import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";

import { store } from "@/store/store";
import RoutesPage from "@/routes.tsx";

const queryClient = new QueryClient();

const App = () => (
    <Provider store={store}>
        <QueryClientProvider client={queryClient}>
            <TooltipProvider>
                <Toaster />
                <BrowserRouter>
                    <RoutesPage />
                </BrowserRouter>
            </TooltipProvider>
        </QueryClientProvider>
    </Provider>
);

export default App;