'use client'

import { useEffect, useState } from 'react'
import { Joyride, STATUS, type EventData, type Step } from 'react-joyride'

const TOUR_KEY = 'scullery_tour_v1'

const steps: Step[] = [
  {
    target: 'body',
    placement: 'center',
    title: 'Welcome to Scullery',
    content: (
      <p>
        Scullery helps your household plan meals, manage recipes, and build grocery lists — all in
        one place. Let&apos;s take a quick look around.
      </p>
    ),
  },
  {
    target: '[data-tour="tile-planner"]',
    placement: 'bottom',
    title: 'Weekly meal planner',
    content: (
      <p>
        Plan breakfasts, lunches, dinners and snacks for each day of the week. Add your own
        recipes or let AI suggest a full plan based on your tastes and what&apos;s in your pantry.
      </p>
    ),
  },
  {
    target: '[data-tour="tile-grocery"]',
    placement: 'bottom',
    title: 'Grocery list',
    content: (
      <p>
        Once your week is planned, Scullery consolidates all the ingredients into a single grocery
        list — grouped by category and with your pantry staples already excluded.
      </p>
    ),
  },
  {
    target: '[data-tour="tile-recipes"]',
    placement: 'bottom',
    title: 'Recipe library',
    content: (
      <p>
        Save your favourite recipes here. They&apos;ll show up as suggestions when you plan meals,
        and you can rate them so the best ones surface first.
      </p>
    ),
  },
  {
    target: '[data-tour="tile-settings"]',
    placement: 'top',
    title: 'Household & settings',
    content: (
      <p>
        Set dietary preferences and pantry staples here. You can also invite household
        members so everyone shares the same meal plans, recipes, and grocery list.
      </p>
    ),
  },
]

export function OnboardingTour() {
  const [run, setRun] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(TOUR_KEY)) {
      // Small delay so the tiles are painted before Joyride measures them
      const t = setTimeout(() => setRun(true), 400)
      return () => clearTimeout(t)
    }
  }, [])

  function handleEvent({ status }: EventData) {
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      localStorage.setItem(TOUR_KEY, '1')
      setRun(false)
    }
  }

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      scrollToFirstStep
      onEvent={handleEvent}
      options={{
        skipBeacon: true,
        showProgress: true,
        buttons: ['back', 'primary', 'skip'],
        primaryColor: '#4a7c59',        // brand-500
        overlayColor: 'rgba(32, 52, 39, 0.5)', // brand-900 tinted
        backgroundColor: '#ffffff',
        textColor: '#374151',           // gray-700
        arrowColor: '#ffffff',
        spotlightRadius: 12,
        zIndex: 10000,
      }}
      styles={{
        tooltip: {
          borderRadius: '14px',
          fontFamily: 'inherit',
          padding: '22px 24px 18px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
          maxWidth: '320px',
        },
        tooltipTitle: {
          fontFamily: 'inherit',
          fontSize: '15px',
          fontWeight: '600',
          color: '#111827',
          marginBottom: '8px',
        },
        tooltipContent: {
          fontSize: '13px',
          lineHeight: '1.6',
          color: '#6b7280',
          padding: '0',
        },
        tooltipFooter: {
          marginTop: '18px',
          gap: '6px',
        },
        buttonPrimary: {
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: '500',
          padding: '7px 16px',
          backgroundColor: '#4a7c59',
        },
        buttonBack: {
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: '500',
          padding: '7px 12px',
          color: '#4a7c59',
          marginRight: '4px',
        },
        buttonSkip: {
          fontSize: '12px',
          color: '#9ca3af',
          padding: '0',
        },
        buttonClose: {
          display: 'none',
        },
      }}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Done',
        next: 'Next',
        nextWithProgress: 'Next ({current} of {total})',
        skip: 'Skip tour',
      }}
    />
  )
}
