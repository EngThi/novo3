# Skulpt has weird errors, and is missing some errors. Compatibility.
try:
    ParseError
except NameError:
    class ParseError(Exception):
        pass
try:
    SyntaxError
except NameError:
    class SyntaxError(Exception):
        pass
try:
    ReferenceError
except NameError:
    class ReferenceError(Exception):
        pass
try:
    EOFError
except NameError:
    class EOFError(Exception):
        pass
try:
    MemoryError
except NameError:
    class MemoryError(Exception):
        pass
try:
    OSError
except NameError:
    class OSError(Exception):
        pass
try:
    TokenError
except NameError:
    class TokenError(Exception):
        pass
try:
    TimeLimitError
except NameError:
    class TimeLimitError(Exception):
        pass

EXTENDED_ERROR_EXPLANATION = {
    ParseError: "A parse error means that Python does not understand the syntax on the line the error message points "
                "out. Common examples are forgetting commas beteween arguments or forgetting a <code>:</code> (colon) "
                "on a for statement.<br><b>Suggestion:</b> To fix a parse error you just need to look carefully at "
                "the line with the error and possibly the line before it.  Make sure it conforms to all of Python's "
                "rules.",
    TypeError: "Type errors most often occur when an expression tries to combine two objects with types that should "
               "not be combined. Like using <code>+</code> to add a number to a list instead of <code>.append</code>, "
               "or dividing a string by a number.<br><b>Suggestion:</b> To fix a type error you will most likely need "
               "to trace through your code and make sure the variables have the types you expect them to have.",
    SyntaxError: "This message indicates that Python can't figure out the syntax of a particular statement.  Some "
                 "examples are assigning to a literal, or a function call.      <br><b>Suggestion: </b>Check your "
                 "assignment statements and make sure that the left hand side of the assignment is a variable, "
                 "not a literal (e.g., 7 or \"hello\") or a function.",
    NameError: "A name error almost always means that you have used a variable before it has a value.  Often this may "
               "be a simple typo, so check the spelling carefully.  <br><b>Suggestion: </b>Check the right hand side "
               "of assignment statements and your function calls, this is the most likely place for a NameError to be "
               "found. It really helps to step through your code, one line at a time, mentally keeping track of your "
               "variables.",
    ValueError: "A ValueError most often occurs when you pass a parameter to a built-in function, and the function is "
                "expecting one type and you pass something  different. For instance, if you try to convert a "
                "non-numeric string to an int, you will get a ValueError:<br><pre>  int(\"Corgi\") # ValueError: "
                "invalid literal for int() with base 10</pre> <br><b>Suggestion: </b>The error message gives you a "
                "pretty good hint about the name of the function as well as the value that is incorrect.  Look at the "
                "error message closely and then trace back to the variable containing the problematic value. }",
    AttributeError: "This happens when you try to do <code>SOMETHING.WHATEVER</code> and either SOMETHING wasn't "
                    "declared or WHATEVER isn't an attribute of SOMETHING. This error message is telling you that the "
                    "object on the left hand side of the dot, does not have the attribute or method on the right hand "
                    "side.      <br><b>Suggestion: </b>You were probably trying to either get access to some data ("
                    "weather.get) or append (a_list.append). If it's the first one, you should make sure the module "
                    "is imported and that you are called its function correctly. If it's the second one, you should "
                    "make sure you spelled \"append\" right and that you are using a variable with a list for a "
                    "value.",
    TokenError: "Most of the time this error indicates that you have forgotten a right parenthesis or have forgotten "
                "to close a pair of quotes.  <br><b>Suggestion: </b>Check each line of your program and make sure "
                "that your parenthesis are balanced.",
    IndexError: "This message means that you are trying to index past the end of a string or a list.  For example, "
                "if your list has 3 things in it and you try to access the item at position 5.  <br><b>Suggestion: "
                "</b>Remember that the first item in a list or string is at index position 0, quite often this "
                "message comes about because you are off by one.  Remember in a list of length 3 the last legal index "
                "is 2.<br><pre>favorite_colors = [\"red\", \"blue\", \"green\"]\nfavorite_colors[2] # prints green "
                "favorite_color[3] # raises an IndexError</pre>",
    ImportError: "This error message indicates that you are trying to import a module that does not exist, or is not "
                 "in the same directory as your python script.  <br><b>Suggestion: </b>One problem may simply be that "
                 "you have a typo - remember, you must not capitalize the module name. Another common problem is that "
                 "you have placed the module in a different directory. Finally, if you're using a dataset module, "
                 "then it might not be imported. Use the \"Import Datasets\" button below!",
    ReferenceError: "This is a really hard error to get, so I'm not entirely sure what you did.  <br><b>Suggestion: "
                    "</b>Bring this code to the instructor. ",
    ZeroDivisionError: "This tells you that you are trying to divide by 0. Typically this is because the value of the "
                       "variable in the denominator of a division expression has the value 0.  <br><b>Suggestion: "
                       "</b>Are you sure you are dividing by the right variable? Are you sure that that variable has "
                       "the value you expect - is it possible that you counted the number of elements in an empty "
                       "list, for instance?",
    IndentationError: "This error occurs when you have not indented your code properly.  This is most likely to "
                      "happen as part of an if, for, while or def statement.  <br><b>Suggestion: </b>Check your if, "
                      "def, for, and while statements to be sure the lines are properly indented beneath them ("
                      "seriously, this happens ALL the time).  Another source of this error comes from copying and "
                      "pasting code where you have accidentally left some bits of code lying around that don't belong "
                      "there anymore. Finally, a very sinister but unlikely possibility is that you have some tab "
                      "characters in your code, which look identical to four spaces. Never, ever use tabs, "
                      "and carefully check code from the internet to make sure it doesn't have tabs.",
    EOFError: "If you are using input() or raw_input() commands, then this error happens when they don't get the "
              "right ending.  <br><b>Suggestion: </b>It's hard to protect against users. However, if you're using "
              "input(), you might be able to use raw_input() instead to avoid this problem. ",
    IOError: "This is a very easy error to get. The most common reason is that you were trying to open a file and it "
             "wasn't in the right place.   <br><b>Suggestion: </b>Make sure that the file is in the right place - "
             "print out the file path, and then check that it's definitely on your computer at that location. If you "
             "need help doing file processing, you should probably check with an instructor.",
    KeyError: "A dictionary has a bunch of keys that you can use to get data. This error is caused by you trying to "
              "refer to a key that does not exist.  <br><b>Suggestion: </b>The most common reason you get this "
              "exception is that you have a typo in your dictionary access. Check your spelling. Also double check "
              "that the key definitely exists.",
    MemoryError: "Somehow, you have run out of memory. <br><b>Suggestion: </b>Make sure you are filtering your "
                 "dataset! Alternatively, bring your code to an instructor.",
    OSError: "It's hard to say what an OSError is without deep checking. Many things can cause it.  "
             "<br><b>Suggestion: </b>Bring your code to an instructor.      ",
    TimeLimitError: "A TimeLimit error means that BlockPy wasn't able to process your program fast enough. Typically, "
                    "this means that you're iterating through too many elements. "
}
