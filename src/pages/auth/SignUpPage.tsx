import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, Radio } from 'lucide-react'
import { AuthLayout } from '@/components/layout/AuthLayout'

export default function SignUpPage() {
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('이름을 입력해주세요.')
      return
    }
    if (!email.trim()) {
      setError('아이디를 입력해주세요.')
      return
    }
    if (!password.trim()) {
      setError('비밀번호를 입력해주세요.')
      return
    }
    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }

    setIsLoading(true)
    await new Promise((r) => setTimeout(r, 800))
    setIsLoading(false)

    navigate('/login', { replace: true })
  }

  const inputClass =
    'w-full rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-sm text-foreground placeholder:text-gray-400 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10'

  return (
    <AuthLayout>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-dark mb-6">
            <Radio className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-primary-dark">
            회원가입
          </h2>
          <p className="mt-2 text-muted-foreground">새 계정을 만들어 시작하세요</p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-xl bg-point-red/5 border border-point-red/20 px-4 py-3 text-sm text-point-red">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <input
            type="text"
            placeholder="이름"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            autoComplete="name"
          />

          <input
            type="text"
            placeholder="아이디"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            autoComplete="username"
          />

          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${inputClass} pr-12`}
              autoComplete="new-password"
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

          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              placeholder="비밀번호 확인"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`${inputClass} pr-12`}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              tabIndex={-1}
            >
              {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-primary py-3.5 text-sm font-semibold text-white transition-all hover:bg-primary-light active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                처리 중...
              </span>
            ) : (
              '회원가입'
            )}
          </button>
        </form>

        {/* Login link */}
        <p className="mt-8 text-center text-sm text-muted-foreground">
          이미 계정이 있으신가요?{' '}
          <Link
            to="/login"
            className="font-semibold text-primary-dark underline underline-offset-2 hover:text-primary transition-colors"
          >
            로그인
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
