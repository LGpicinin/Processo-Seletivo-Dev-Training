
export default class Student {
    constructor(fouls, p1, p2, p3) {
        this.p1 = p1;
        this.p2 = p2;
        this.p3 = p3;
        this.fouls = fouls;
        this.finalSituation = '';
        this.noteToFinalAprovation = 0;
        this.media = parseInt((p1 + p2 + p3)/3);

        if((p1 + p2 + p3)/3 > this.media)
            this.media = this.media + 1;
    }
}