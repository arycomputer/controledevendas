'use client'

import { useState, useMemo } from "react"
import { MoreHorizontal, PlusCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { UserForm } from "./user-form"
import type { User } from "@/lib/types"
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection, deleteDoc, doc, setDoc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { ConfirmationDialog } from "@/components/app/confirmation-dialog"

export function UsersManagement() {
    const firestore = useFirestore()
    const { toast } = useToast()
    const usersCollection = useMemoFirebase(() => collection(firestore, 'users'), [firestore]);
    const { data: users, isLoading } = useCollection<User>(usersCollection);
    
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);

    const handleAction = (action: string, user: User) => {
        if (action === 'edit') {
            setEditingUser(user);
            setIsDialogOpen(true);
        } else if (action === 'delete'){
            setUserToDelete(user);
            setIsConfirmDialogOpen(true);
        }
    };

    const handleConfirmDelete = async () => {
        if (!userToDelete || !firestore) return;
        try {
            await deleteDoc(doc(firestore, 'users', userToDelete.id));
            toast({ title: "Sucesso!", description: `Usuário "${userToDelete.name}" removido.` });
            // Note: Deleting from Auth is a privileged operation and should be handled by a backend function.
            // This implementation only removes the user from the Firestore collection.
        } catch (error) {
            console.error("Error deleting user:", error);
            toast({ title: "Erro!", description: "Não foi possível remover o usuário.", variant: 'destructive' });
        }
        setIsConfirmDialogOpen(false);
        setUserToDelete(null);
    }
    
    const handleNewUser = () => {
        setEditingUser(null);
        setIsDialogOpen(true);
    }
    
    const handleFormSubmit = async (userData: User, userId: string) => {
        if (!firestore) return;
        const userWithId = { ...userData, id: userId };
        
        try {
            await setDoc(doc(firestore, "users", userId), userWithId, { merge: true });
        } catch(error) {
            console.error("Error saving user to Firestore: ", error);
            toast({
                title: "Erro de Sincronização",
                description: "Não foi possível salvar os detalhes do usuário no banco de dados.",
                variant: "destructive"
            });
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button onClick={handleNewUser}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Novo Usuário
                </Button>
            </div>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>E-mail</TableHead>
                        <TableHead>Função</TableHead>
                        <TableHead><span className="sr-only">Ações</span></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                     {isLoading ? (
                        <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center">
                                <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                            </TableCell>
                        </TableRow>
                    ) : users && users.length > 0 ? (
                        users.map((user) => (
                            <TableRow key={user.id}>
                                <TableCell className="font-medium">{user.name}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>
                                    <Badge variant={user.role === 'admin' ? "destructive" : "secondary"}>
                                        {user.role === 'admin' ? 'Admin' : 'Vendedor'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0" disabled={user.email === 'admin@admin.com'}>
                                                <span className="sr-only">Abrir menu</span>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                            <DropdownMenuItem onClick={() => handleAction('edit', user)}>Editar</DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={() => handleAction('delete', user)} className="text-destructive focus:text-destructive focus:bg-destructive/10">Remover</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                         <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center">
                                Nenhum usuário encontrado.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
                         <DialogDescription>
                           {editingUser ? 'Atualize os dados do usuário.' : 'Preencha os dados para criar um novo usuário.'}
                        </DialogDescription>
                    </DialogHeader>
                    <UserForm 
                        user={editingUser} 
                        onSuccess={handleFormSubmit}
                        onClose={() => setIsDialogOpen(false)} 
                    />
                </DialogContent>
            </Dialog>
             <ConfirmationDialog
                open={isConfirmDialogOpen}
                onOpenChange={setIsConfirmDialogOpen}
                title="Tem certeza?"
                description={`Esta ação removerá o usuário "${userToDelete?.name}" do sistema. Esta ação não pode ser desfeita.`}
                onConfirm={handleConfirmDelete}
                confirmText="Sim, remover usuário"
            />
        </div>
    )
}
