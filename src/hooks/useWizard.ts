'use client'

import { useCallback, useState } from 'react'

export const useWizard = ({
  totalSteps,
  initialStep = 0,
}: {
  totalSteps: number
  initialStep?: number
}) => {
  const [currentStep, setCurrentStep] = useState(initialStep)

  const goNext = useCallback(
    () => setCurrentStep((s) => Math.min(s + 1, totalSteps - 1)),
    [totalSteps],
  )

  const goPrev = useCallback(() => setCurrentStep((s) => Math.max(s - 1, 0)), [])

  const goTo = useCallback(
    (step: number) => setCurrentStep(Math.max(0, Math.min(step, totalSteps - 1))),
    [totalSteps],
  )

  return {
    currentStep,
    totalSteps,
    isFirst: currentStep === 0,
    isLast: currentStep === totalSteps - 1,
    goNext,
    goPrev,
    goTo,
  }
}
