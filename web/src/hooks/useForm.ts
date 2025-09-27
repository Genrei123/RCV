import { useState, useCallback } from 'react'

export interface UseFormOptions<T> {
  initialValues: T
  validate?: (values: T) => Partial<Record<keyof T, string>>
}

export interface UseFormReturn<T> {
  values: T
  errors: Partial<Record<keyof T, string>>
  isSubmitting: boolean
  handleChange: (name: keyof T, value: any) => void
  handleSubmit: (onSubmit: (values: T) => Promise<void> | void) => Promise<void>
  setFieldError: (name: keyof T, error: string) => void
  clearErrors: () => void
  resetForm: () => void
}

export function useForm<T extends Record<string, any>>({
  initialValues,
  validate
}: UseFormOptions<T>): UseFormReturn<T> {
  const [values, setValues] = useState<T>(initialValues)
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = useCallback((name: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }))
    // Clear error when field is changed
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }))
    }
  }, [errors])

  const setFieldError = useCallback((name: keyof T, error: string) => {
    setErrors(prev => ({ ...prev, [name]: error }))
  }, [])

  const clearErrors = useCallback(() => {
    setErrors({})
  }, [])

  const resetForm = useCallback(() => {
    setValues(initialValues)
    setErrors({})
    setIsSubmitting(false)
  }, [initialValues])

  const handleSubmit = useCallback(async (onSubmit: (values: T) => Promise<void> | void) => {
    setIsSubmitting(true)
    setErrors({})

    try {
      // Run validation if provided
      if (validate) {
        const validationErrors = validate(values)
        if (Object.keys(validationErrors).length > 0) {
          setErrors(validationErrors)
          return
        }
      }

      // Submit the form
      await onSubmit(values)
    } catch (error: any) {
      // Handle API errors
      if (error?.response?.data?.errors) {
        setErrors(error.response.data.errors)
      } else {
        console.error('Form submission error:', error)
      }
    } finally {
      setIsSubmitting(false)
    }
  }, [values, validate])

  return {
    values,
    errors,
    isSubmitting,
    handleChange,
    handleSubmit,
    setFieldError,
    clearErrors,
    resetForm
  }
}