package com.herspace.connect.core.util

import java.time.LocalDate
import java.time.temporal.ChronoUnit
import kotlin.math.roundToInt

// Port of src/lib/cycle-stats.ts + Cycle & Hormones section of health.tsx
// Uses java.time (available natively on minSdk 26).

object CycleMath {
    fun daysBetween(a: String, b: String): Int =
        ChronoUnit.DAYS.between(LocalDate.parse(a), LocalDate.parse(b)).toInt()

    fun addDays(iso: String, n: Int): String =
        LocalDate.parse(iso).plusDays(n.toLong()).toString()

    fun periodStarts(entryDates: List<String>): List<String> =
        entryDates.distinct().sortedDescending()

    fun cycleLengths(startsAsc: List<String>): List<Int> {
        val out = mutableListOf<Int>()
        for (i in 1 until startsAsc.size) {
            val d = daysBetween(startsAsc[i - 1], startsAsc[i])
            if (d in 11..89) out.add(d)
        }
        return out
    }

    fun average(lengths: List<Int>): Int? =
        if (lengths.isEmpty()) null else lengths.average().roundToInt()

    fun predictNextWindow(lastStart: String?, avgCycle: Int?, variance: Int): Triple<String, String, String>? {
        if (lastStart == null || avgCycle == null) return null
        val pad = maxOf(1, variance)
        val mid = addDays(lastStart, avgCycle)
        return Triple(addDays(mid, -pad), mid, addDays(mid, pad))
    }

    enum class Phase { MENSTRUAL, FOLLICULAR, OVULATION, LUTEAL }

    fun phaseForDay(day: Int, cycleLength: Int): Phase {
        if (day <= 5) return Phase.MENSTRUAL
        val ovDay = cycleLength - 14
        if (day < ovDay) return Phase.FOLLICULAR
        if (day <= ovDay + 1) return Phase.OVULATION
        return Phase.LUTEAL
    }

    fun cycleDay(lastPeriod: String?, today: String, cycleLength: Int): Int? {
        if (lastPeriod == null) return null
        val diff = daysBetween(lastPeriod, today)
        if (diff < 0) return null
        return (diff % cycleLength) + 1
    }

    fun fertileWindow(lastPeriodStart: String, cycleLength: Int): FertileWindow {
        val ov = addDays(lastPeriodStart, maxOf(10, cycleLength - 14))
        return FertileWindow(start = addDays(ov, -5), ovulation = ov, end = addDays(ov, 1))
    }

    data class FertileWindow(val start: String, val ovulation: String, val end: String)
}

// Port of src/lib/pregnancy.ts
object PregnancyMath {
    fun addDays(iso: String, n: Int): String = CycleMath.addDays(iso, n)
    fun daysBetween(a: String, b: String): Int = CycleMath.daysBetween(a, b)

    fun dueDateFromLmp(lmp: String): String = addDays(lmp, 280)
    fun dueDateFromConception(conception: String): String = addDays(conception, 266)

    data class GestationalAge(val weeks: Int, val days: Int, val totalDays: Int)

    fun gestationalAge(lmp: String, on: String): GestationalAge {
        val d = maxOf(0, daysBetween(lmp, on))
        return GestationalAge(weeks = d / 7, days = d % 7, totalDays = d)
    }

    fun trimesterOf(week: Int): Int = when {
        week <= 13 -> 1
        week <= 27 -> 2
        else -> 3
    }

    private val sizes = mapOf(
        4 to "poppy seed", 5 to "sesame seed", 6 to "lentil", 7 to "blueberry",
        8 to "kidney bean", 9 to "grape", 10 to "kumquat", 11 to "fig", 12 to "lime",
        13 to "pea pod", 14 to "lemon", 15 to "apple", 16 to "avocado", 17 to "turnip",
        18 to "bell pepper", 19 to "mango", 20 to "banana", 21 to "carrot", 22 to "papaya",
        23 to "grapefruit", 24 to "corn cob", 25 to "cauliflower", 26 to "lettuce head",
        27 to "cabbage", 28 to "eggplant", 29 to "butternut squash", 30 to "cucumber",
        31 to "coconut", 32 to "jicama", 33 to "pineapple", 34 to "cantaloupe",
        35 to "honeydew melon", 36 to "romaine lettuce", 37 to "chard bunch",
        38 to "leek", 39 to "mini watermelon", 40 to "small pumpkin"
    )

    fun babySize(week: Int): String? = sizes[week.coerceIn(1, 40)]
}
