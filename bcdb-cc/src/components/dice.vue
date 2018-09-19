<template>
	<div class="wrap">
		<div :id="ID" class="dice dice_1"></div>
	</div>
</template>
<script>
	export default {
		name: 'dice',
		data: function() {
			return {
				ID: 'dice-' + Math.floor(Math.random()*Date.now()),
				isRolling: false
			}
		},
		mounted () {
			const self = this;
			const dice = $(`#${this.ID}`);
			dice.click(function () {
				if(self.isRolling) return;
				self.isRolling = true;
				$(".wrap").append("<div id='dice_mask'></div>");//add mask
				dice.attr("class", "dice");//After clearing the last points animation
				dice.css('cursor', 'default');
				const num = Math.floor(Math.random() * 6 + 1);//random num 1-6
				dice.animate({ left: '+2px' }, 100, function () {
					dice.addClass("dice_t");
				})
				.delay(200).animate({ top: '-2px' }, 100, function () {
					dice.removeClass("dice_t").addClass("dice_s");
				})
				.delay(200).animate({ opacity: 'show' }, 600, function () {
					dice.removeClass("dice_s").addClass("dice_e");
				})
				.delay(100).animate({ left: '-2px', top: '2px' }, 100, function () {					
					dice.removeClass("dice_e").addClass("dice_" + num);
					//$("#result").html("Your throwing points are<span>" + num + "</span>");
					dice.css('cursor', 'pointer');
					$("#dice_mask").remove();//remove mask

					self.$emit('roll', num);
					self.isRolling = false;
				});
			});			
		}
	}
</script>
<style scoped>
.wrap{width:90px; height:90px; margin:120px auto 30px auto; position:relative} 
.dice{width:90px; height:90px; background:url(dice.png) no-repeat;} 
.dice_1{background-position:-5px -4px} 
.dice_2{background-position:-5px -107px} 
.dice_3{background-position:-5px -212px} 
.dice_4{background-position:-5px -317px} 
.dice_5{background-position:-5px -427px} 
.dice_6{background-position:-5px -535px} 
.dice_t{background-position:-5px -651px} 
.dice_s{background-position:-5px -763px} 
.dice_e{background-position:-5px -876px} 
p#result{text-align:center; font-size:16px} 
p#result span{font-weight:bold; color:#f30; margin:6px} 
#dice_mask{width:90px; height:90px; background:#fff; opacity:0; position:absolute; 
 top:0; left:0; z-index:999} 	
</style>