import { configureStore } from '@reduxjs/toolkit';
import { baseApi } from '@/lib/baseApi.ts';
import { accessControlApi } from '@/pages/AccessControl/AccessControlApi.ts';
import {reconciliationApi} from "@/pages/Reconciliation/reconciliationApi.ts";
import {templateApi} from "@/pages/TemplateCreator/templateApi.ts";

export const store = configureStore({
    reducer: {
        [baseApi.reducerPath]: baseApi.reducer,
        [accessControlApi.reducerPath]: accessControlApi.reducer,
        [reconciliationApi.reducerPath]: reconciliationApi.reducer,
        [templateApi.reducerPath]: templateApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware()
            .concat(baseApi.middleware)
            .concat(accessControlApi.middleware)
            .concat(reconciliationApi.middleware)
            .concat(templateApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;