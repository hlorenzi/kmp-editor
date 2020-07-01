export default class Memoized
{
    constructor(fn)
    {
        this.fn = fn
        this.src = null
        this.value = null
    }


    get(src)
    {
        if (src !== this.src)
        {
            this.src = src
            this.value = this.fn(src)
        }

        return this.value
    }
}