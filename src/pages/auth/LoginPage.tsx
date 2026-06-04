import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Radio } from 'lucide-react'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { useAuthStore } from '@/stores/authStore'

export default function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email.trim()) {
      setError('아이디를 입력해주세요.')
      return
    }
    if (!password.trim()) {
      setError('비밀번호를 입력해주세요.')
      return
    }

    setIsLoading(true)
    await new Promise((r) => setTimeout(r, 600))

    const result = login(email, password)

    if (result.success) {
      navigate('/', { replace: true })
    } else {
      setError(result.error ?? '로그인에 실패했습니다.')
    }

    setIsLoading(false)
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-dark mb-6">
            <Radio className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-primary-dark">
            히어링루프 모니터링
          </h2>
          <p className="mt-2 text-muted-foreground">로그인하여 시작하세요</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ID */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              아이디
            </label>
            <input
              type="text"
              placeholder="아이디를 입력해 주세요."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3.5 text-sm text-foreground placeholder:text-gray-400 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10"
              autoComplete="username"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              비밀번호
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="비밀번호를 입력해 주세요."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3.5 pr-12 text-sm text-foreground placeholder:text-gray-400 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-point-red">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-point-red text-white text-xs font-bold shrink-0">
                !
              </span>
              {error}
            </div>
          )}

          {/* Login Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-primary-dark py-4 text-base font-semibold text-white transition-all hover:bg-primary-dark/90 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                로그인 중...
              </span>
            ) : (
              '로그인'
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-auth-end px-4 text-sm text-muted-foreground">
              로그인 정보가 필요하신가요?
            </span>
          </div>
        </div>

        {/* Admin contact */}
        <div className="text-center">
          <button
            type="button"
            className="text-sm font-semibold text-primary hover:text-primary-dark transition-colors hover:underline underline-offset-2"
          >
            관리자 문의
          </button>
        </div>

        {/* Demo hint */}
        <div className="mt-10 rounded-lg bg-main-blue-1/40 border border-main-blue-1 p-4">
          <p className="text-xs font-medium text-primary-dark/60 mb-2">데모 계정</p>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>관리자: <span className="font-mono font-semibold text-primary-dark">admin</span> / 비밀번호 아무거나</p>
            <p>사용자: <span className="font-mono font-semibold text-primary-dark">user</span> / 비밀번호 아무거나</p>
          </div>
        </div>
      </div>
    </AuthLayout>
  )
}
