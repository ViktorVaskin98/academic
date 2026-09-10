from fractions import Fraction
from math import gcd

from manim import (
    BLACK,
    DOWN,
    LEFT,
    RIGHT,
    UP,
    Create,
    Dot,
    FadeIn,
    FadeOut,
    Line,
    NumberLine,
    Scene,
    Text,
    Transform,
    VGroup,
    Write,
    config,
)

BACKGROUND = "#0e1116"
TEXT = "#e6edf3"
MUTED = "#9aa7b4"
SET_COLOR = "#2f81f7"
INTERIOR = "#3fb950"
BOUNDARY = "#f0883e"
HIGHLIGHT = "#f778ba"
NEIGHBOURHOOD = "#bc8cff"
FONT = "Segoe UI"

config.background_color = BACKGROUND


def label(content: str, size: int = 30, color: str = TEXT, weight: str = "NORMAL") -> Text:
    return Text(content, font=FONT, font_size=size, color=color, weight=weight)


def segment(line: NumberLine, low: float, high: float, color: str, width: float = 7.0,
            shift: float = 0.0) -> VGroup:
    body = Line(
        line.n2p(low) + UP * shift,
        line.n2p(high) + UP * shift,
        stroke_width=width,
        color=color,
    )
    ends = VGroup(*[
        Dot(point, radius=0.07, color=color, fill_opacity=0.0, stroke_width=3).set_stroke(color)
        for point in (line.n2p(low) + UP * shift, line.n2p(high) + UP * shift)
    ])
    for end in ends:
        end.set_fill(BACKGROUND, opacity=1.0)
    return VGroup(body, ends)


class FiniteIntersection(Scene):
    def construct(self) -> None:
        title = label("Почему в аксиоме 3 пересечение только конечное", 32).to_edge(UP)
        self.play(Write(title), run_time=1.2)

        axis = NumberLine(
            x_range=[-1.2, 1.2, 0.5],
            length=11,
            include_numbers=True,
            font_size=24,
            color=MUTED,
            decimal_number_config={"num_decimal_places": 1},
        ).shift(DOWN * 0.4)
        self.play(Create(axis), run_time=0.8)

        formula = label("Uₙ = (−1/n, 1/n) — открытый интервал при каждом n", 26, MUTED)
        formula.next_to(title, DOWN, buff=0.35)
        self.play(FadeIn(formula), run_time=0.6)

        stack: list[VGroup] = []
        counter = label("n = 1", 26, SET_COLOR).move_to(LEFT * 5.9 + UP * 1.9)
        self.play(FadeIn(counter), run_time=0.4)

        for index in range(1, 9):
            bound = 1.0 / index
            piece = segment(axis, -bound, bound, SET_COLOR, 7.0, 2.9 - 0.24 * index)
            new_counter = label(f"n = {index}", 26, SET_COLOR).move_to(counter)
            self.play(
                Create(piece),
                Transform(counter, new_counter),
                run_time=0.5 if index < 4 else 0.3,
            )
            for older in stack:
                older.set_stroke(opacity=0.35)
            stack.append(piece)

        self.wait(0.4)

        finite = label("пересечение восьми множеств = (−1/8, 1/8)", 28, INTERIOR)
        finite.next_to(axis, DOWN, buff=0.5)
        result = segment(axis, -0.125, 0.125, INTERIOR, 10.0, 0.55)
        self.play(Create(result), FadeIn(finite), run_time=0.9)
        verdict = label("открыто — конечное число операций безопасно", 26, INTERIOR)
        verdict.next_to(finite, DOWN, buff=0.25)
        self.play(FadeIn(verdict), run_time=0.7)
        self.wait(1.2)

        self.play(FadeOut(verdict), FadeOut(finite), FadeOut(result), run_time=0.5)

        limit = label("а теперь возьмём все n сразу", 30, HIGHLIGHT)
        limit.next_to(axis, DOWN, buff=0.5)
        self.play(FadeIn(limit), run_time=0.6)

        collapse = Dot(axis.n2p(0), radius=0.1, color=HIGHLIGHT)
        self.play(
            *[piece.animate.set_stroke(opacity=0.12) for piece in stack],
            Create(collapse),
            run_time=1.0,
        )

        answer = label("⋂ₙ Uₙ = {0}", 40, HIGHLIGHT, "BOLD")
        answer.next_to(limit, DOWN, buff=0.3)
        self.play(Write(answer), run_time=1.0)
        self.wait(0.6)

        moral = label("одна точка не открыта в стандартной топологии", 28, BOUNDARY)
        moral.next_to(answer, DOWN, buff=0.25)
        self.play(FadeIn(moral), run_time=0.8)
        self.wait(2.0)


class BoundaryOfRationals(Scene):
    def construct(self) -> None:
        title = label("Граница множества ℚ — вся прямая", 34).to_edge(UP)
        self.play(Write(title), run_time=1.2)

        axis = NumberLine(
            x_range=[0, 1, 0.25],
            length=11,
            include_numbers=True,
            font_size=24,
            color=MUTED,
            decimal_number_config={"num_decimal_places": 2},
        ).shift(UP * 0.9)
        self.play(Create(axis), run_time=0.8)

        caption = label("рациональные точки со знаменателем до 16", 26, SET_COLOR)
        caption.next_to(axis, DOWN, buff=0.5)
        self.play(FadeIn(caption), run_time=0.5)

        for limit in (4, 8, 12, 16):
            wave = VGroup()
            for denominator in range(2, limit + 1):
                for numerator in range(1, denominator):
                    if gcd(numerator, denominator) != 1:
                        continue
                    if denominator > limit - 4:
                        wave.add(Dot(
                            axis.n2p(Fraction(numerator, denominator)),
                            radius=0.045,
                            color=SET_COLOR,
                        ))
            if len(wave) > 0:
                self.play(FadeIn(wave), run_time=0.6)

        self.wait(0.5)
        self.play(FadeOut(caption), run_time=0.4)

        window = Line(
            axis.n2p(0.42) + UP * 0.42,
            axis.n2p(0.58) + UP * 0.42,
            stroke_width=3,
            color=NEIGHBOURHOOD,
        )
        window_label = label("любой интервал (a, b)", 24, NEIGHBOURHOOD)
        window_label.next_to(window, UP, buff=0.2)
        self.play(Create(window), FadeIn(window_label), run_time=0.8)

        zoom = NumberLine(
            x_range=[0.42, 0.58, 0.04],
            length=9,
            include_numbers=False,
            color=MUTED,
        ).shift(DOWN * 1.4)
        zoom_caption = label("тот же интервал под увеличением", 24, MUTED)
        zoom_caption.next_to(zoom, UP, buff=0.3)
        self.play(Create(zoom), FadeIn(zoom_caption), run_time=0.8)

        rationals = VGroup(*[
            Dot(zoom.n2p(float(Fraction(numerator, denominator))), radius=0.06, color=SET_COLOR)
            for denominator in range(2, 40)
            for numerator in range(1, denominator)
            if gcd(numerator, denominator) == 1 and 0.42 < numerator / denominator < 0.58
        ])
        irrationals = VGroup(*[
            Dot(zoom.n2p(0.42 + 0.16 * ((step * 0.7071067811865476) % 1.0)), radius=0.06,
                color=BOUNDARY)
            for step in range(1, 26)
        ])

        first = label("в любом интервале есть рациональная точка", 26, SET_COLOR)
        first.next_to(zoom, DOWN, buff=0.5)
        self.play(FadeIn(rationals), FadeIn(first), run_time=1.0)
        self.wait(0.8)

        second = label("и иррациональная тоже", 26, BOUNDARY)
        second.next_to(first, DOWN, buff=0.25)
        self.play(FadeIn(irrationals), FadeIn(second), run_time=1.0)
        self.wait(1.0)

        self.play(
            FadeOut(zoom), FadeOut(zoom_caption), FadeOut(rationals), FadeOut(irrationals),
            FadeOut(first), FadeOut(second), FadeOut(window), FadeOut(window_label),
            run_time=0.6,
        )

        conclusion = VGroup(
            label("значит ни один интервал не лежит целиком ни в ℚ, ни в ℚᶜ", 28, MUTED),
            label("Int(ℚ) = ∅        Int(ℚᶜ) = ∅", 34, INTERIOR),
            label("∂ℚ = ℝ", 46, HIGHLIGHT, "BOLD"),
        ).arrange(DOWN, buff=0.45).shift(DOWN * 1.3)

        for line in conclusion:
            self.play(FadeIn(line), run_time=0.7)

        whole = Line(axis.n2p(0), axis.n2p(1), stroke_width=12, color=HIGHLIGHT)
        self.play(Create(whole), run_time=1.0)
        self.wait(2.0)
