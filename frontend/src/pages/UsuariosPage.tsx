import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Edit, KeyRound, Plus, Power } from 'lucide-react'
import type { FormEvent, ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { DataTable } from '@/components/common/DataTable'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { LoadingState } from '@/components/common/LoadingState'
import { PageHeader } from '@/components/common/PageHeader'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { normalizeRole, roleLabels, roles, type UserRole } from '@/lib/roles'
import { formatDate } from '@/lib/utils'
import { usuariosService } from '@/services/usuarios.service'
import type { UsuarioAdmin, UsuarioPayload } from '@/types/usuario'

const emptyForm: UsuarioPayload = {
  nome: '',
  email: '',
  perfil: 'ATENDENTE',
  status: 'ATIVO',
  senha: '',
}

function getFriendlyUserError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : ''
  if (message.includes('property ') && message.includes(' should not exist')) return fallback
  return message || fallback
}

export function UsuariosPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<UsuarioAdmin | null>(null)
  const [form, setForm] = useState<UsuarioPayload>(emptyForm)
  const [feedback, setFeedback] = useState('')
  const [formError, setFormError] = useState('')

  const usuarios = useQuery({ queryKey: ['usuarios-admin'], queryFn: usuariosService.listar })

  const salvar = useMutation({
    mutationFn: () => {
      const payload: UsuarioPayload = { ...form, perfil: normalizeRole(form.perfil) }
      if (editing) {
        const { senha, ...updatePayload } = payload
        return usuariosService.atualizar(editing.id, updatePayload)
      }
      return usuariosService.criar(payload)
    },
    onSuccess: () => {
      setFeedback(editing ? 'Usuário atualizado com sucesso.' : 'Usuário criado com sucesso.')
      closeDialog()
      queryClient.invalidateQueries({ queryKey: ['usuarios-admin'] })
    },
    onError: (error) => setFormError(getFriendlyUserError(error, 'Não foi possível salvar o usuário. Verifique os dados informados.')),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => usuariosService.alterarStatus(id, isActive),
    onSuccess: () => {
      setFeedback('Status do usuário atualizado.')
      queryClient.invalidateQueries({ queryKey: ['usuarios-admin'] })
    },
    onError: (error) => setFeedback(getFriendlyUserError(error, 'Não foi possível atualizar o status do usuário.')),
  })

  const resetMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) => usuariosService.redefinirSenha(id, password),
    onSuccess: () => {
      setFeedback('Senha provisória redefinida.')
      closeDialog()
      queryClient.invalidateQueries({ queryKey: ['usuarios-admin'] })
    },
    onError: (error) => setFormError(getFriendlyUserError(error, 'Não foi possível redefinir a senha provisória.')),
  })

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (usuarios.data ?? []).filter((usuario) =>
      [usuario.nome, usuario.email, roleLabels[normalizeRole(usuario.cargo)], usuario.status]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term),
    )
  }, [search, usuarios.data])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setFormError('')
    setDialogOpen(true)
  }

  function openEdit(usuario: UsuarioAdmin) {
    setEditing(usuario)
    setForm({
      nome: usuario.nome,
      email: usuario.email,
      perfil: normalizeRole(usuario.cargo),
      status: usuario.isActive ? 'ATIVO' : 'INATIVO',
      senha: '',
    })
    setFormError('')
    setDialogOpen(true)
  }

  function closeDialog() {
    setDialogOpen(false)
    setEditing(null)
    setForm(emptyForm)
    setFormError('')
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    setFormError('')
    if (!form.nome.trim() || !form.email.trim()) {
      setFormError('Informe nome e e-mail.')
      return
    }
    if (!editing && !form.senha) {
      setFormError('Informe uma senha provisória para o novo usuário.')
      return
    }
    salvar.mutate()
  }

  if (usuarios.isLoading) return <LoadingState label="Carregando usuários..." />
  if (usuarios.isError) return <ErrorState message={usuarios.error.message} />

  return (
    <section>
      <PageHeader
        title="Usuários"
        description="Administração de acessos, funções e status dos usuários do AvanceOS."
        actions={
          <Button type="button" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Novo usuário
          </Button>
        }
      />

      {feedback ? <Alert variant="success" className="mb-4">{feedback}</Alert> : null}

      <div className="mb-4 max-w-md">
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome, e-mail, função ou status" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Nenhum usuário encontrado" message="Cadastre usuários ou ajuste a busca." />
      ) : (
        <DataTable
          data={filtered}
          getRowKey={(row) => row.id}
          columns={[
            { key: 'nome', header: 'Nome', render: (row) => <span className="font-semibold text-foreground">{row.nome}</span> },
            { key: 'email', header: 'E-mail', render: (row) => row.email },
            { key: 'cargo', header: 'Função', render: (row) => roleLabels[normalizeRole(row.cargo)] },
            { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.isActive ? 'ATIVO' : 'INATIVO'} /> },
            { key: 'criadoEm', header: 'Criado em', render: (row) => formatDate(row.createdAt || row.criadoEm) },
            {
              key: 'acoes',
              header: 'Ações',
              render: (row) => (
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" className="h-8 px-2 text-xs" onClick={() => openEdit(row)}>
                    <Edit className="h-3.5 w-3.5" />
                    Editar
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-8 px-2 text-xs"
                    onClick={() => statusMutation.mutate({ id: row.id, isActive: !row.isActive })}
                  >
                    <Power className="h-3.5 w-3.5" />
                    {row.isActive ? 'Desativar' : 'Ativar'}
                  </Button>
                </div>
              ),
            },
          ]}
        />
      )}

      <Dialog
        open={dialogOpen}
        title={editing ? 'Editar usuário' : 'Novo usuário'}
        description="Defina identificação, função e status do acesso administrativo."
        onClose={closeDialog}
        contentClassName="max-w-3xl"
      >
        <form className="space-y-4" onSubmit={submit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nome">
              <Input value={form.nome} onChange={(event) => setForm({ ...form, nome: event.target.value })} />
            </Field>
            <Field label="E-mail">
              <Input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            </Field>
            <Field label="Função">
              <Select value={form.perfil} onChange={(event) => setForm({ ...form, perfil: event.target.value as UserRole })}>
                {roles.map((role) => (
                  <option key={role} value={role}>{roleLabels[role]}</option>
                ))}
              </Select>
            </Field>
            <Field label="Status">
              <Select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as UsuarioPayload['status'] })}>
                <option value="ATIVO">Ativo</option>
                <option value="INATIVO">Inativo</option>
              </Select>
            </Field>
          </div>

          <Field label={editing ? 'Nova senha provisória' : 'Senha provisória'}>
            <Input
              type="password"
              value={form.senha || ''}
              onChange={(event) => setForm({ ...form, senha: event.target.value })}
              placeholder={editing ? 'Opcional para redefinir senha' : 'Mínimo 6 caracteres'}
            />
          </Field>

          {formError ? <Alert variant="error">{formError}</Alert> : null}

          <div className="flex flex-wrap justify-end gap-2">
            {editing && form.senha ? (
              <Button
                type="button"
                variant="secondary"
                disabled={resetMutation.isPending}
                onClick={() => resetMutation.mutate({ id: editing.id, password: form.senha || '' })}
              >
                <KeyRound className="h-4 w-4" />
                Redefinir senha
              </Button>
            ) : null}
            <Button type="button" variant="secondary" onClick={closeDialog}>Cancelar</Button>
            <Button type="submit" disabled={salvar.isPending}>{salvar.isPending ? 'Salvando...' : 'Salvar usuário'}</Button>
          </div>
        </form>
      </Dialog>
    </section>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  )
}
