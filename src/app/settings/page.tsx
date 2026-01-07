import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompanyForm } from "@/components/app/settings/company-form";
import { UsersManagement } from "@/components/app/settings/users-management";
import { RegistrationManager } from "@/components/app/settings/registration-manager";

export default function SettingsPage() {
    return (
        <div className="flex flex-col gap-8">
            <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
            <Tabs defaultValue="company">
                <TabsList className="grid w-full grid-cols-3 max-w-lg">
                    <TabsTrigger value="company">Empresa</TabsTrigger>
                    <TabsTrigger value="users">Usuários</TabsTrigger>
                    <TabsTrigger value="registration">Cadastros</TabsTrigger>
                </TabsList>
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
            </Tabs>
        </div>
    )
}
