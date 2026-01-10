'use client'

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompanyForm } from "@/components/app/settings/company-form";
import { UsersManagement } from "@/components/app/settings/users-management";
import { RegistrationManager } from "@/components/app/settings/registration-manager";
import { ThemeSelector } from "@/components/app/settings/theme-selector";
import { AuthGuard } from "@/components/app/auth-guard";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

function SettingsPageContent() {
    return (
        <div className="flex flex-col gap-8">
            <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
            <Tabs defaultValue="company" className="w-full">
                <ScrollArea className="w-full">
                    <TabsList className="grid w-full grid-cols-4 min-w-[400px]">
                        <TabsTrigger value="company">Empresa</TabsTrigger>
                        <TabsTrigger value="users">Usuários</TabsTrigger>
                        <TabsTrigger value="registration">Cadastros</TabsTrigger>
                        <TabsTrigger value="themes">Temas</TabsTrigger>
                    </TabsList>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
                <TabsContent value="company">
                    <Card>
                        <CardHeader>
                            <CardTitle>Dados da Empresa</CardTitle>
                            <CardDescription>Gerencie as informações da sua empresa.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <CompanyForm />
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="users">
                    <Card>
                        <CardHeader>
                            <CardTitle>Gerenciar Usuários</CardTitle>
                            <CardDescription>Adicione, edite ou remova usuários do sistema.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <UsersManagement />
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="registration">
                    <Card>
                        <CardHeader>
                            <CardTitle>Gerenciador de Cadastros</CardTitle>
                            <CardDescription>Defina quais campos são obrigatórios nos formulários de cadastro.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <RegistrationManager />
                        </CardContent>
                    </Card>
                </TabsContent>
                 <TabsContent value="themes">
                    <Card>
                        <CardHeader>
                            <CardTitle>Temas</CardTitle>
                            <CardDescription>Personalize a aparência da aplicação.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ThemeSelector />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}

export default function SettingsPage() {
    return (
        <AuthGuard>
            <SettingsPageContent />
        </AuthGuard>
    )
}
