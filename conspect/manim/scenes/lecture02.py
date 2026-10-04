from manim import (
    DOWN,
    LEFT,
    UP,
    Create,
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
FONT = "Segoe UI"

config.background_color = BACKGROUND


def label(content: str, size: int = 28, color: str = TEXT, weight: str = "NORMAL") -> Text:
    return Text(content, font=FONT, font_size=size, color=color, weight=weight)


def bar(axis: NumberLine, low: float, high: float, color: str, lift: float, width: float = 7.0) -> Line:
    return Line(axis.n2p(low) + UP * lift, axis.n2p(high) + UP * lift, stroke_width=width, color=color)


class NoFiniteSubcover(Scene):
    def construct(self) -> None:
        title = label("Почему (0, 1) не компактно", 34).to_edge(UP)
        self.play(Write(title), run_time=1.0)

        axis = NumberLine(
            x_range=[0, 1, 0.25],
            length=10.5,
            include_numbers=True,
            font_size=24,
            color=MUTED,
            decimal_number_config={"num_decimal_places": 2},
        ).shift(DOWN * 1.2)
        self.play(Create(axis), run_time=0.7)

        target = bar(axis, 0.0, 1.0, MUTED, 0.0, 10.0).set_opacity(0.45)
        self.play(Create(target), run_time=0.5)

        caption = label("покрытие: лучи (1/n, 1), n = 2, 3, 4, …", 26, SET_COLOR)
        caption.next_to(title, DOWN, buff=0.3)
        self.play(FadeIn(caption), run_time=0.5)

        pieces = VGroup()
        for index, n in enumerate(range(2, 12)):
            piece = bar(axis, 1.0 / n, 1.0, SET_COLOR, 3.0 - 0.21 * index, 5.0)
            pieces.add(piece)
            self.play(Create(piece), run_time=0.32 if index < 3 else 0.18)

        gap_value = 1.0 / 11
        covered = bar(axis, gap_value, 1.0, INTERIOR, 0.0, 10.0)
        gap = bar(axis, 0.0, gap_value, BOUNDARY, 0.0, 12.0)
        verdict = label("взяли 10 множеств — непокрытым остался (0, 1/11]", 26, BOUNDARY)
        verdict.next_to(axis, DOWN, buff=0.6)
        self.play(Create(covered), Create(gap), FadeIn(verdict), run_time=1.0)
        self.wait(0.8)

        for count in (20, 60, 200):
            new_gap = bar(axis, 0.0, 1.0 / (count + 1), BOUNDARY, 0.0, 12.0)
            new_covered = bar(axis, 1.0 / (count + 1), 1.0, INTERIOR, 0.0, 10.0)
            new_verdict = label(f"взяли {count} множеств — остался (0, 1/{count + 1}]", 26, BOUNDARY)
            new_verdict.move_to(verdict)
            self.play(Transform(gap, new_gap), Transform(covered, new_covered),
                      Transform(verdict, new_verdict), run_time=0.8)
            self.wait(0.3)

        moral = label("любое конечное N оставляет щель (0, 1/N] — подпокрытия нет", 26, HIGHLIGHT)
        moral.next_to(verdict, DOWN, buff=0.3)
        self.play(FadeIn(moral), run_time=0.8)
        self.wait(1.4)

        self.play(FadeOut(moral), FadeOut(verdict), FadeOut(caption), run_time=0.5)

        fix = label("а у отрезка [0, 1] точку 0 обязано накрыть что-то открытое", 26, INTERIOR)
        fix.next_to(title, DOWN, buff=0.3)
        self.play(FadeIn(fix), run_time=0.6)
        zero_patch = bar(axis, -0.06, 0.1, INTERIOR, 0.0, 12.0)
        closed_gap = bar(axis, 0.0, 1.0, INTERIOR, 0.0, 10.0)
        self.play(FadeOut(gap), Create(zero_patch), Transform(covered, closed_gap), run_time=1.0)
        final = label("оно заодно закрывает щель — и конечного числа множеств хватает", 26, INTERIOR)
        final.next_to(axis, DOWN, buff=0.6)
        self.play(FadeIn(final), run_time=0.8)
        self.wait(2.0)
