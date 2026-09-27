package com.herspace.connect

import com.herspace.connect.core.util.CycleMath
import com.herspace.connect.core.util.PregnancyMath
import org.junit.Assert.*
import org.junit.Test

class DomainMathTest {
    @Test fun cycleDay_wraps() {
        assertEquals(1, CycleMath.cycleDay("2026-09-01", "2026-09-01", 28))
        assertEquals(28, CycleMath.cycleDay("2026-09-01", "2026-09-28", 28))
        assertEquals(1, CycleMath.cycleDay("2026-09-01", "2026-09-29", 28))
    }

    @Test fun fertileWindow_math() {
        val w = CycleMath.fertileWindow("2026-09-01", 28)
        assertEquals("2026-09-15", w.ovulation)
        assertEquals("2026-09-10", w.start)
    }

    @Test fun pregnancy_dueDate() {
        assertEquals("2026-10-08", PregnancyMath.dueDateFromLmp("2026-01-01"))
        val ga = PregnancyMath.gestationalAge("2026-01-01", "2026-01-15")
        assertEquals(2, ga.weeks)
        assertEquals(0, ga.days)
        assertEquals(2, PregnancyMath.trimesterOf(20))
    }

    @Test fun phase_classification() {
        assertEquals(CycleMath.Phase.MENSTRUAL, CycleMath.phaseForDay(3, 28))
        assertEquals(CycleMath.Phase.OVULATION, CycleMath.phaseForDay(14, 28))
        assertEquals(CycleMath.Phase.LUTEAL, CycleMath.phaseForDay(22, 28))
    }
}
