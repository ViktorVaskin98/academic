from math import pi, tan

from manim import (
    DOWN,
    UP,
    Arrow,
    Create,
    Dot,
    FadeIn,
    FadeOut,
    Line,
    NumberLine,
    Scene,
    Text,
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
FONT = "Segoe UI"
REACH = 8.0

config.background_color = BACKGROUND


def label(content: str, size: int = 28, color: str = TEXT, weight: str = "NORMAL") -> Text:
    return Text(content, font=FONT, font_size=size, color=color, weight=weight)


def note(content: str, size: int, color: str) -> Text:
    text = label(content, size, color)
    text.add_background_rectangle(color=BACKGROUND, opacity=0.92, buff=0.12)
    return text


SAMPLE_FRACTIONS = sorted(
    {k / 12 for k in range(-11, 12)} | {sign * edge for sign in (-1, 1) for edge in (0.96, 0.985, 0.995)}
)


class IntervalToLine(Scene):
    def construct(self) -> None:
        title = label("tg растягивает интервал (−π/2, π/2) на всю прямую", 32).to_edge(UP)
        self.play(Write(title), run_time=1.0)

        source = NumberLine(x_range=[-pi / 2, pi / 2, pi / 4], length=6, color=SET_COLOR,
                            include_ticks=False).shift(UP * 1.6)
        target = NumberLine(x_range=[-REACH, REACH, 2], length=12.5, include_numbers=True,
                            font_size=22, color=MUTED).shift(DOWN * 1.6)
        source_label = label("(−π/2, π/2)", 24, SET_COLOR).next_to(source, UP, buff=0.25)
        target_label = label("ℝ", 28, TEXT).next_to(target, DOWN, buff=0.45)
        self.play(Create(source), FadeIn(source_label), run_time=0.8)
        self.play(Create(target), FadeIn(target_label), run_time=0.8)

        links = VGroup()
        for fraction in SAMPLE_FRACTIONS:
            x = fraction * (pi / 2)
            y = tan(x)
            start = source.n2p(x)
            if abs(y) <= REACH:
                links.add(Line(start, target.n2p(y), stroke_width=1.6, color=MUTED, stroke_opacity=0.75))
            else:
                end = target.n2p(REACH if y > 0 else -REACH) + UP * 0.9
                links.add(Arrow(start, end, buff=0, stroke_width=2, color=BOUNDARY,
                                max_tip_length_to_length_ratio=0.08))
        self.play(Create(links), run_time=2.2)

        hint = note("чем ближе x к краю, тем дальше улетает tg x", 24, MUTED).shift(DOWN * 0.1)
        self.play(FadeIn(hint), run_time=0.6)
        self.wait(0.6)

        runner = Dot(source.n2p(0), radius=0.09, color=HIGHLIGHT)
        image = Dot(target.n2p(0), radius=0.09, color=HIGHLIGHT)
        self.play(FadeIn(runner), FadeIn(image), run_time=0.4)
        for x in (1.0, 1.3, 1.45, -1.0, -1.45, 0.0):
            self.play(
                runner.animate.move_to(source.n2p(x)),
                image.animate.move_to(target.n2p(max(-REACH, min(REACH, tan(x))))),
                run_time=0.7,
            )
        self.play(FadeOut(hint), run_time=0.4)

        verdict = note("обратное — arctg, непрерывно: (a, b) ≃ ℝ", 28, INTERIOR).shift(DOWN * 0.1)
        self.play(FadeIn(verdict), run_time=0.8)
        self.wait(1.0)
        self.play(FadeOut(verdict), FadeOut(runner), FadeOut(image), run_time=0.5)

        ends = VGroup(*[Dot(source.n2p(edge), radius=0.11, color=BOUNDARY) for edge in (-pi / 2, pi / 2)])
        ends_note = note("добавим концы: отрезок [−π/2, π/2]", 26, BOUNDARY).shift(DOWN * 0.1)
        self.play(FadeIn(ends), FadeIn(ends_note), run_time=0.8)
        self.wait(0.6)
        nowhere = note("концам некуда отобразиться — на прямой нет точек ±∞", 26, BOUNDARY)
        nowhere.move_to(ends_note)
        self.play(FadeOut(ends_note), FadeIn(nowhere), run_time=0.6)
        self.wait(0.8)
        moral = note("отрезок компактен, прямая нет: [a, b] и (a, b) не гомеоморфны", 26, HIGHLIGHT)
        moral.next_to(nowhere, DOWN, buff=0.3)
        self.play(FadeIn(moral), run_time=0.8)
        self.wait(2.0)
