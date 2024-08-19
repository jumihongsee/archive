function checkLogin(req,res,next){
    if(!req.user){
        res.render('login.ejs')
    }   
    next()
}

module.exports = checkLogin