'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, ShoppingCart, Package, Settings, LogOut, FileText, ClipboardList } from 'lucide-react';
import Image from 'next/image';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  useSidebar,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { useCompany } from '@/context/company-context';
import { useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/customers', label: 'Clientes', icon: Users },
  { href: '/products', label: 'Produtos', icon: Package },
  { href: '/budgets', label: 'Orçamentos', icon: ClipboardList },
  { href: '/sales', label: 'Vendas', icon: ShoppingCart },
  { href: '/service-orders', label: 'Ordens de Serviço', icon: FileText },
  { href: '/settings', label: 'Configurações', icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { state } = useSidebar();
  const { companyData } = useCompany();
  const auth = useAuth();

  const handleSignOut = () => {
    if (auth) {
        signOut(auth).then(() => {
            // Limpa o armazenamento local para garantir que nenhum dado de sessão persista.
            localStorage.clear();
            sessionStorage.clear();
            // Redireciona para a página inicial para forçar a recarga e a verificação de autenticação.
            window.location.href = '/';
        });
    }
  }

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className="flex flex-col items-center gap-4 p-4">
        <div className="w-full flex justify-start">
            <SidebarTrigger />
        </div>
        {state === 'expanded' && companyData.logo && (
          <div className="relative w-full h-20 rounded-md overflow-hidden">
             <Image 
                src={companyData.logo} 
                alt="Logo da empresa" 
                fill 
                className="object-contain"
                data-ai-hint="logo company"
            />
          </div>
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))}
                tooltip={{children: item.label, side: 'right', align: 'center'}}
              >
                <Link href={item.href}>
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
       <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleSignOut} tooltip={{children: 'Sair', side: 'right', align: 'center'}}>
              <LogOut className="h-5 w-5" />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
