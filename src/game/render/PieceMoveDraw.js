import { Animated, Easing } from 'react-native';
import PieceDraw from './PieceDraw';

export default class PieceMoveDraw extends PieceDraw {
  constructor(piece, animationData, layout, duration = 160) {
    // animationData: { from:{r,c}, to:{r,c} }
    super(piece);
    this.from = animationData.from;
    this.to = animationData.to;
    this.duration = duration;
    this.layout = layout;

    // 初始位置：from
    this.translate = new Animated.ValueXY({
      x: this.layout.toX(this.from.c),
      y: this.layout.toY(this.from.r)
    });
    this.opacity = new Animated.Value(1);
    this.scale = new Animated.Value(1);

    this.running = false;
  }

  play(onEnd) {
    if (this.running) return;
    this.running = true;
    
    Animated.timing(this.translate, {
      toValue: { 
        x: this.layout.toX(this.to.c), 
        y: this.layout.toY(this.to.r) 
      },
      duration: this.duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      this.running = false;
      onEnd && onEnd();
    });
  }

  render() {
    return super.render({
      row: this.from.r,
      col: this.from.c,
      layout: this.layout,
      anim: { 
        translateX: this.translate.x, 
        translateY: this.translate.y, 
        opacity: this.opacity, 
        scale: this.scale 
      }
    });
  }
}