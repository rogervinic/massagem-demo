import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import './index.css'
import { StoreProvider } from './lib/store'
import { Toaster } from './components/ui'
import { AdminLayout, ClientLayout } from './layouts'
import { Forgot, Home, Login, Privacy, Register } from './pages/public'
import Anamnesis from './pages/client/Anamnesis'
import { Book, ClientHistory, ClientHome, ClientNotifications, ClientPackages, ClientProfile, ClientWaitlist } from './pages/client/pages'
import AdminDashboard from './pages/admin/Dashboard'
import Agenda from './pages/admin/Agenda'
import { ClientDetail, ClientsList } from './pages/admin/Clients'
import { AdminAnamneses, AdminFinance, AdminNotifications, AdminPackages, AdminReports, AdminServices, AdminSettings, AdminWaitlist } from './pages/admin/more'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/entrar" element={<Login key="cliente" />} />
          <Route path="/cadastro" element={<Register />} />
          <Route path="/recuperar-senha" element={<Forgot />} />
          <Route path="/privacidade" element={<Privacy />} />
          <Route path="/admin/login" element={<Login key="admin" admin />} />
          <Route path="/cliente" element={<ClientLayout />}>
            <Route index element={<ClientHome />} />
            <Route path="agendar" element={<Book />} />
            <Route path="anamnese" element={<Anamnesis />} />
            <Route path="historico" element={<ClientHistory />} />
            <Route path="pacotes" element={<ClientPackages />} />
            <Route path="perfil" element={<ClientProfile />} />
            <Route path="lista-de-espera" element={<ClientWaitlist />} />
            <Route path="notificacoes" element={<ClientNotifications />} />
          </Route>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="agenda" element={<Agenda />} />
            <Route path="clientes" element={<ClientsList />} />
            <Route path="clientes/:id" element={<ClientDetail />} />
            <Route path="anamneses" element={<AdminAnamneses />} />
            <Route path="servicos" element={<AdminServices />} />
            <Route path="pacotes" element={<AdminPackages />} />
            <Route path="financeiro" element={<AdminFinance />} />
            <Route path="relatorios" element={<AdminReports />} />
            <Route path="lista-de-espera" element={<AdminWaitlist />} />
            <Route path="notificacoes" element={<AdminNotifications />} />
            <Route path="configuracoes" element={<AdminSettings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
      <Toaster />
    </StoreProvider>
  </StrictMode>,
)
