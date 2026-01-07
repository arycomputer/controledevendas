'use client'

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import type { User } from "@/lib/types"
import { useAuth } from "@/firebase"
import { initiateEmailSignUp } from "@/firebase/non-blocking-login"
import { useEffect } from "react"


const userFormSchema = z.object({
  name: z.string().min(2, "O nome é obrigatório."),
  email: z.string().email("E-mail inválido."),
  password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres."),
  role: z.enum(["admin", "seller"], { required_error: "A função é obrigatória." }),
})

type UserFormValues = z.infer<typeof userFormSchema>

interface UserFormProps {
    user: User | null;
    onSuccess: (user: User) => void;
    onClose: () => void;
}

export function UserForm({ user, onSuccess, onClose }: UserFormProps) {
  const { toast } = useToast()
  const auth = useAuth();
  
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "seller",
    },
  })
  
  useEffect(() => {
    if (user) {
        form.reset({
            name: user.name,
            email: user.email,
            password: "", // Password should not be pre-filled
            role: user.role,
        })
    }
  }, [user, form]);

  function onSubmit(data: UserFormValues) {
    if (user) {
        // In a real app, you would handle user update logic here
        console.log("Update user", data)
        toast({ title: "Sucesso!", description: "Usuário atualizado." })
        onSuccess({ ...data, id: user.id });
    } else {
        // Create new user with Firebase Auth
        initiateEmailSignUp(auth, data.email, data.password);
        toast({ title: "Sucesso!", description: "Usuário criado." })
        onSuccess({ ...data, id: '' }); // ID will be set by Firebase, handle it in parent
    }
    onClose();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome Completo</FormLabel>
              <FormControl>
                <Input placeholder="Nome do usuário" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-mail</FormLabel>
              <FormControl>
                <Input placeholder="usuario@example.com" {...field} disabled={!!user}/>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {!user && (
            <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Senha</FormLabel>
                <FormControl>
                    <Input type="password" placeholder="Mínimo 6 caracteres" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        )}
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Função</FormLabel>
               <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a função" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="seller">Vendedor</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
         <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
            </Button>
            <Button type="submit">Salvar</Button>
        </div>
      </form>
    </Form>
  )
}
